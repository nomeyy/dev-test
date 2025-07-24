import { randomUUID } from "crypto";
import type {
  SSEManagerType,
  SSEManagerConfig,
  SSEClient,
  SSEEvent,
  SSEManagerStats,
} from "../types/index.js";
import { createSSEError } from "../types/sse-errors";
import { SSEConnectionState } from "../types/sse-types";
// Import the global client stream map for event delivery
import { sseClientStreams } from "@/app/api/sse/route";
import { setTimeout as delay } from "timers/promises";

/**
 * SSE Manager service for handling Server-Sent Events
 *
 * This service manages client connections, event broadcasting, and connection lifecycle.
 *
 * @example
 * ```typescript
 * const sseManager = new SSEManager(config);
 * await sseManager.connectClient(clientInfo);
 * await sseManager.sendEventToUser('user-123', { type: 'notification', data: { message: 'Hello' } });
 * ```
 */
export class SSEManager implements SSEManagerType {
  private config: SSEManagerConfig;
  private clients: Map<string, SSEClient> = new Map();
  private userClients: Map<string, Set<string>> = new Map();
  private groupClients: Map<string, Set<string>> = new Map();
  private stats: SSEManagerStats;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private isShutdown = false;
  private errorCount = 0;
  private lastError: string | null = null;

  constructor(config: SSEManagerConfig) {
    this.config = config;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalEventsSent: 0,
      eventsSentToday: 0,
      averageEventLatency: 0,
      uptime: Date.now(),
      lastCleanup: new Date(),
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  // Connection management methods
  async connectClient(
    client: Omit<
      SSEClient,
      "connectionTime" | "lastHeartbeat" | "isConnected" | "state"
    >,
  ): Promise<void> {
    if (this.isShutdown) {
      throw createSSEError.connectionFailed("SSE Manager is shutdown");
    }

    if (this.clients.size >= this.config.maxConnections) {
      throw createSSEError.connectionFailed("Maximum connections reached");
    }

    const now = new Date();
    const fullClient: SSEClient = {
      ...client,
      connectionTime: now,
      lastHeartbeat: now,
      isConnected: true,
      state: SSEConnectionState.CONNECTED,
    };

    // Store client
    this.clients.set(client.id, fullClient);

    // Add to user mapping if userId exists
    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client.id);
    }

    // Add to group mappings
    client.groups.forEach((group) => {
      if (!this.groupClients.has(group)) {
        this.groupClients.set(group, new Set());
      }
      this.groupClients.get(group)!.add(client.id);
    });

    // Update stats
    this.stats.totalConnections++;
    this.stats.activeConnections = this.getConnectedClients().length;

    if (this.config.enableLogging) {
      console.log(
        `SSE Client connected: ${client.id} (User: ${client.userId || "anonymous"})`,
      );
    }
  }

  async disconnectClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw createSSEError.clientNotFound(clientId);
    }

    client.isConnected = false;
    client.state = SSEConnectionState.DISCONNECTED;

    // Remove from user mapping
    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    // Remove from group mappings
    client.groups.forEach((group) => {
      const groupClients = this.groupClients.get(group);
      if (groupClients) {
        groupClients.delete(clientId);
        if (groupClients.size === 0) {
          this.groupClients.delete(group);
        }
      }
    });

    // Remove client
    this.clients.delete(clientId);

    // Update stats
    this.stats.activeConnections = this.getConnectedClients().length;

    if (this.config.enableLogging) {
      console.log(`SSE Client disconnected: ${clientId}`);
    }
  }

  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  getConnectedClients(): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.isConnected,
    );
  }

  getClientsByUser(userId: string): SSEClient[] {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter(
        (client): client is SSEClient =>
          client !== undefined && client.isConnected,
      );
  }

  getClientsByGroup(group: string): SSEClient[] {
    const clientIds = this.groupClients.get(group);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter(
        (client): client is SSEClient =>
          client !== undefined && client.isConnected,
      );
  }

  // Event broadcasting methods
  async sendEventToClient(
    clientId: string,
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      this.errorCount++;
      this.lastError = `Client not found: ${clientId}`;
      throw createSSEError.clientNotFound(clientId);
    }
    if (!client.isConnected) {
      this.errorCount++;
      this.lastError = `Client disconnected: ${clientId}`;
      throw createSSEError.clientDisconnected(clientId);
    }
    // Role-based access control: if event.metadata.roles is set, only deliver if client has at least one required role
    if (event.metadata?.roles && Array.isArray(event.metadata.roles)) {
      const clientRoles = client.roles || [];
      const allowed = event.metadata.roles.some((role: string) =>
        clientRoles.includes(role),
      );
      if (!allowed) {
        if (this.config.enableLogging) {
          console.log(
            `⛔ Event '${event.type}' not delivered to client ${client.id} due to RBAC.`,
          );
        }
        return;
      }
    }

    const fullEvent: SSEEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date(),
    };

    // Automatic retry mechanism
    const maxRetries = 3;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < maxRetries) {
      try {
        await this.sendEventToClientStream(client, fullEvent);
        this.stats.totalEventsSent++;
        this.stats.eventsSentToday++;
        if (this.config.enableLogging) {
          console.log(`Event sent to client ${clientId}: ${event.type}`);
        }
        return;
      } catch (error) {
        attempt++;
        this.errorCount++;
        this.lastError = error instanceof Error ? error.message : String(error);
        lastErr = error;
        if (this.config.enableLogging) {
          console.error(
            `Retry ${attempt}/${maxRetries} failed for client ${clientId}:`,
            error,
          );
        }
        if (attempt < maxRetries) {
          await delay(50 * attempt); // Exponential backoff
        }
      }
    }
    throw createSSEError.eventSendFailed(event.type, clientId, {
      error: lastErr,
    });
  }

  async sendEventToUser(
    userId: string,
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void> {
    const userClients = this.getClientsByUser(userId);
    if (userClients.length === 0) {
      if (this.config.enableLogging) {
        console.log(`No connected clients found for user: ${userId}`);
      }
      return;
    }

    const promises = userClients.map((client) =>
      this.sendEventToClient(client.id, event).catch((error) => {
        if (this.config.enableLogging) {
          console.error(`Failed to send event to client ${client.id}:`, error);
        }
      }),
    );

    await Promise.allSettled(promises);
  }

  async sendEventToGroup(
    group: string,
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void> {
    const groupClients = this.getClientsByGroup(group);
    if (groupClients.length === 0) {
      if (this.config.enableLogging) {
        console.log(`No connected clients found for group: ${group}`);
      }
      return;
    }

    const promises = groupClients.map((client) =>
      this.sendEventToClient(client.id, event).catch((error) => {
        if (this.config.enableLogging) {
          console.error(`Failed to send event to client ${client.id}:`, error);
        }
      }),
    );

    await Promise.allSettled(promises);
  }

  async broadcastEvent(
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void> {
    const connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0) {
      if (this.config.enableLogging) {
        console.log("No connected clients to broadcast to");
      }
      return;
    }

    const promises = connectedClients.map((client) =>
      this.sendEventToClient(client.id, event).catch((error) => {
        if (this.config.enableLogging) {
          console.error(
            `Failed to broadcast event to client ${client.id}:`,
            error,
          );
        }
      }),
    );

    await Promise.allSettled(promises);
  }

  // Heartbeat management methods
  async updateHeartbeat(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = new Date();
    }
  }

  async cleanupStaleConnections(): Promise<void> {
    const now = new Date();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > this.config.connectionTimeout) {
        staleClients.push(clientId);
      }
    }

    if (staleClients.length > 0 && this.config.enableLogging) {
      console.log(
        `🧹 Found ${staleClients.length} stale connections to clean up`,
      );
    }

    for (const clientId of staleClients) {
      try {
        await this.disconnectClient(clientId);
        if (this.config.enableLogging) {
          console.log(`✅ Cleaned up stale connection: ${clientId}`);
        }
      } catch (error) {
        if (this.config.enableLogging) {
          console.error(
            `❌ Error cleaning up stale connection ${clientId}:`,
            error,
          );
        }
      }
    }

    this.stats.lastCleanup = now;
  }

  // Statistics and monitoring methods
  getConnectionCount(): number {
    return this.clients.size;
  }

  getStats(): SSEManagerStats {
    return {
      ...this.stats,
      activeConnections: this.getConnectedClients().length,
      uptime: Date.now() - this.stats.uptime,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  // Lifecycle methods
  async shutdown(): Promise<void> {
    this.isShutdown = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all clients
    const clientIds = Array.from(this.clients.keys());
    await Promise.allSettled(clientIds.map((id) => this.disconnectClient(id)));

    if (this.config.enableLogging) {
      console.log("SSE Manager shutdown complete");
    }
  }

  // Private helper methods
  private startHeartbeat(): void {
    if (this.config.heartbeatInterval > 0) {
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeatToAllClients().catch((error) => {
          if (this.config.enableLogging) {
            console.error("Error during heartbeat:", error);
          }
        });
      }, this.config.heartbeatInterval);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections().catch((error) => {
        if (this.config.enableLogging) {
          console.error("Error during cleanup:", error);
        }
      });
    }, 60000); // Cleanup every minute
  }

  private async sendHeartbeatToAllClients(): Promise<void> {
    const connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0) return;

    const heartbeatEvent: Omit<SSEEvent, "id" | "timestamp"> = {
      type: "heartbeat",
      data: { timestamp: Date.now() },
      metadata: { priority: "low" },
    };

    if (this.config.enableLogging) {
      console.log(
        `💓 Broadcasting heartbeat to ${connectedClients.length} clients`,
      );
    }

    await this.broadcastEvent(heartbeatEvent);
  }

  private async sendEventToClientStream(
    client: SSEClient,
    event: SSEEvent,
  ): Promise<void> {
    // Look up the stream controller for this client
    const controller = sseClientStreams.get(client.id);
    if (!controller) {
      throw createSSEError.clientDisconnected(client.id);
    }
    // Format the SSE event
    const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(sseData));
    if (this.config.enableLogging) {
      console.log(`📤 Delivered event '${event.type}' to client ${client.id}`);
    }
  }
}
