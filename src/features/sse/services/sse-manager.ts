import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEClient,
  SSEEvent,
  SSEManagerConfig,
  SSEConnectionOptions,
  BroadcastOptions,
} from "../types";
import { SSESystemEvents as SystemEvents } from "../types";

const { log, handleError } = createServiceContext("SSEManager");

/**
 * Centralized Server-Sent Events manager
 * Handles client connections, event dispatching, and connection lifecycle
 */
export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private userConnections = new Map<string, Set<string>>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private config: SSEManagerConfig;

  constructor(config?: Partial<SSEManagerConfig>) {
    this.config = {
      defaultHeartbeatInterval: 5000, // 30 seconds
      maxConnectionsPerUser: 5,
      connectionTimeout: 300000, // 5 minutes
      enableDebugLogging: process.env.NODE_ENV === "development",
      ...config,
    };

    // Clean up stale connections periodically
    setInterval(() => this.cleanupStaleConnections(), 60000); // Every minute
  }

  /**
   * Create a new SSE connection
   */
  createConnection(options: SSEConnectionOptions = {}): Response {
    const clientId = this.generateClientId();

    const stream = new ReadableStream({
      start: (controller) => {
        try {
          // Check connection limits for authenticated users
          if (options.userId && !this.canUserConnect(options.userId)) {
            controller.error(
              new Error("Maximum connections exceeded for user"),
            );
            return;
          }

          const client: SSEClient = {
            id: clientId,
            userId: options.userId,
            response: new Response(), // Will be set below
            controller: controller as ReadableStreamDefaultController<string>,
            connectedAt: new Date(),
            lastActivity: new Date(),
            metadata: options.metadata,
          };

          // Store client connection
          this.clients.set(clientId, client);

          // Track user connections
          if (options.userId) {
            if (!this.userConnections.has(options.userId)) {
              this.userConnections.set(options.userId, new Set());
            }
            this.userConnections.get(options.userId)!.add(clientId);
          }

          // Set up heartbeat
          this.setupHeartbeat(
            clientId,
            options.heartbeatInterval ?? this.config.defaultHeartbeatInterval,
          );

          // Send connection established event
          this.sendToClient(clientId, {
            event: SystemEvents.CONNECTION_ESTABLISHED,
            data: {
              clientId,
              timestamp: new Date().toISOString(),
              userId: options.userId,
            },
          });

          log.info("SSE client connected", {
            clientId,
            userId: options.userId,
            totalConnections: this.clients.size,
          });
        } catch (error) {
          handleError("creating SSE connection", error);
          controller.error(error);
        }
      },

      cancel: () => {
        this.disconnectClient(clientId);
      },
    });

    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });

    // Update the client with the actual response
    const client = this.clients.get(clientId);
    if (client) {
      client.response = response;
    }

    return response;
  }

  /**
   * Send event to specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      if (this.config.enableDebugLogging) {
        log.warn("Attempted to send event to non-existent client", {
          clientId,
          event: event.event,
        });
      }
      return false;
    }

    try {
      const formattedEvent = this.formatSSEEvent(event);
      client.controller.enqueue(formattedEvent);
      client.lastActivity = new Date();

      if (this.config.enableDebugLogging) {
        log.debug("Event sent to client", { clientId, event: event.event });
      }

      return true;
    } catch (error) {
      handleError(`sending event to client ${clientId}`, error);
      this.disconnectClient(clientId);
      return false;
    }
  }

  /**
   * Send event to specific user (all their connections)
   */
  sendToUser(userId: string, event: SSEEvent): number {
    const userClients = this.userConnections.get(userId);
    if (!userClients || userClients.size === 0) {
      if (this.config.enableDebugLogging) {
        log.debug("No active connections for user", {
          userId,
          event: event.event,
        });
      }
      return 0;
    }

    let sentCount = 0;
    for (const clientId of userClients) {
      if (this.sendToClient(clientId, event)) {
        sentCount++;
      }
    }

    log.info("Event sent to user connections", {
      userId,
      event: event.event,
      sentCount,
      totalConnections: userClients.size,
    });

    return sentCount;
  }

  /**
   * Broadcast event to multiple clients based on options
   */
  broadcast(event: SSEEvent, options: BroadcastOptions = {}): number {
    let targetClients: SSEClient[] = [];

    if (options.userIds) {
      // Target specific users
      for (const userId of options.userIds) {
        const userClients = this.userConnections.get(userId);
        if (userClients) {
          for (const clientId of userClients) {
            const client = this.clients.get(clientId);
            if (client) targetClients.push(client);
          }
        }
      }
    } else if (options.clientIds) {
      // Target specific clients
      for (const clientId of options.clientIds) {
        const client = this.clients.get(clientId);
        if (client) targetClients.push(client);
      }
    } else {
      // Broadcast to all clients
      targetClients = Array.from(this.clients.values());
    }

    // Apply filters
    if (options.excludeClientIds) {
      targetClients = targetClients.filter(
        (client) => !options.excludeClientIds!.includes(client.id),
      );
    }

    if (options.filter) {
      targetClients = targetClients.filter(options.filter);
    }

    // Send to target clients
    let sentCount = 0;
    for (const client of targetClients) {
      if (this.sendToClient(client.id, event)) {
        sentCount++;
      }
    }

    log.info("Event broadcasted", {
      event: event.event,
      sentCount,
      totalTargeted: targetClients.length,
    });

    return sentCount;
  }

  /**
   * Disconnect a specific client
   */
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Send disconnect event before closing
      this.sendToClient(clientId, {
        event: SystemEvents.CONNECTION_CLOSED,
        data: {
          clientId,
          timestamp: new Date().toISOString(),
          reason: "server_disconnect",
        },
      });

      // Close the stream
      client.controller.close();
    } catch {
      // Ignore errors when closing
    }

    // Clean up heartbeat
    const heartbeat = this.heartbeatIntervals.get(clientId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(clientId);
    }

    // Remove from user connections
    if (client.userId) {
      const userClients = this.userConnections.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);

    log.info("SSE client disconnected", {
      clientId,
      userId: client.userId,
      totalConnections: this.clients.size,
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const userStats = new Map<string, number>();
    for (const [userId, clients] of this.userConnections) {
      userStats.set(userId, clients.size);
    }

    return {
      totalConnections: this.clients.size,
      totalUsers: this.userConnections.size,
      userConnections: Object.fromEntries(userStats),
      config: this.config,
    };
  }

  /**
   * Get all connected clients (for admin/debugging)
   */
  getClients(): Omit<SSEClient, "response" | "controller">[] {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      userId: client.userId,
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity,
      metadata: client.metadata,
    }));
  }

  // Private methods

  private generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private canUserConnect(userId: string): boolean {
    const userClients = this.userConnections.get(userId);
    return !userClients || userClients.size < this.config.maxConnectionsPerUser;
  }

  private setupHeartbeat(clientId: string, interval: number): void {
    const heartbeat = setInterval(() => {
      this.sendToClient(clientId, {
        event: SystemEvents.HEARTBEAT,
        data: { timestamp: new Date().toISOString() },
      });
    }, interval);

    this.heartbeatIntervals.set(clientId, heartbeat);
  }

  private formatSSEEvent(event: SSEEvent): string {
    let formatted = "";

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    formatted += `event: ${event.event}\n`;
    formatted += `data: ${JSON.stringify(event.data)}\n`;

    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    formatted += "\n";

    return formatted;
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleClientIds: string[] = [];

    for (const [clientId, client] of this.clients) {
      const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
      if (timeSinceActivity > this.config.connectionTimeout) {
        staleClientIds.push(clientId);
      }
    }

    for (const clientId of staleClientIds) {
      log.info("Cleaning up stale SSE connection", { clientId });
      this.disconnectClient(clientId);
    }

    if (staleClientIds.length > 0) {
      log.info("Cleaned up stale connections", {
        count: staleClientIds.length,
        remainingConnections: this.clients.size,
      });
    }
  }
}

// Export singleton instance
export const sseManager = new SSEManager();
