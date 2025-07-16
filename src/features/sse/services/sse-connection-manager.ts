import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEClient,
  SSEEvent,
  SSEConnectionManager,
  SSEServiceOptions,
  HeartbeatConfig,
} from "../types";
import { DEFAULT_SSE_OPTIONS } from "../types";

const { log, handleError } = createServiceContext("SSEConnectionManager");

/**
 * SSE Connection Manager
 * Manages client connections, event dispatching, and heartbeat functionality
 */
export class SSEConnectionManagerService implements SSEConnectionManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private options: SSEServiceOptions;
  private totalConnections = 0;
  private startTime = Date.now();

  constructor(options: SSEServiceOptions = DEFAULT_SSE_OPTIONS) {
    this.options = { ...DEFAULT_SSE_OPTIONS, ...options };
    this.startHeartbeat();
  }

  /**
   * Connect a new SSE client
   */
  async connect(client: SSEClient): Promise<void> {
    try {
      // Check connection limits
      if (this.clients.size >= (this.options.maxConnections || 1000)) {
        log.warn("Maximum connections reached", {
          current: this.clients.size,
          max: this.options.maxConnections,
        });
        throw new Error("Maximum connections exceeded");
      }

      // Add client to active connections
      this.clients.set(client.id, client);
      this.totalConnections++;

      log.info("Client connected", {
        clientId: client.id,
        userId: client.userId,
        sessionId: client.sessionId,
        totalClients: this.clients.size,
      });

      // Send initial connection event
      await this.send(client.id, {
        id: `connection-${client.id}`,
        event: "connected",
        data: {
          clientId: client.id,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Set up cleanup on client disconnect
      client.controller.signal.addEventListener("abort", () => {
        this.disconnect(client.id);
      });
    } catch (error) {
      return handleError("connecting client", error);
    }
  }

  /**
   * Disconnect an SSE client
   */
  async disconnect(clientId: string): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        log.warn("Attempted to disconnect non-existent client", { clientId });
        return;
      }

      // Close the connection
      try {
        await client.writer.close();
      } catch (error) {
        log.debug("Error closing client writer", { clientId, error });
      }

      // Abort the controller
      client.controller.abort();

      // Remove from active connections
      this.clients.delete(clientId);

      log.info("Client disconnected", {
        clientId,
        userId: client.userId,
        sessionId: client.sessionId,
        totalClients: this.clients.size,
        connectionDuration: Date.now() - client.connectedAt,
      });
    } catch (error) {
      return handleError("disconnecting client", error);
    }
  }

  /**
   * Send an event to a specific client
   */
  async send(clientId: string, event: SSEEvent): Promise<boolean> {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        log.warn("Attempted to send to non-existent client", { clientId });
        return false;
      }

      const sseData = this.formatSSEEvent(event);
      const encoder = new TextEncoder();

      try {
        await client.writer.write(encoder.encode(sseData));

        if (this.options.enableLogging) {
          log.debug("Event sent to client", {
            clientId,
            event: event.event,
            userId: client.userId,
          });
        }

        return true;
      } catch (error) {
        log.warn("Failed to send event to client", {
          clientId,
          event: event.event,
          error,
        });

        // Client connection is broken, clean up
        await this.disconnect(clientId);
        return false;
      }
    } catch (error) {
      handleError("sending event to client", error);
      return false;
    }
  }

  /**
   * Send an event to all clients of a specific user
   */
  async sendToUser(userId: string, event: SSEEvent): Promise<number> {
    try {
      const userClients: SSEClient[] = [];
      for (const [clientId, client] of this.clients) {
        if (client.userId === userId) {
          userClients.push(client);
        }
      }
      log.info("User Clients:");
      log.info(JSON.stringify(userClients));
      let successCount = 0;
      const promises = userClients.map(async (client) => {
        const success = await this.send(client.id, event);
        if (success) successCount++;
      });

      await Promise.all(promises);

      log.info("Event sent to user", {
        userId,
        event: event.event,
        clientCount: userClients.length,
        successCount,
      });

      return successCount;
    } catch (error) {
      return handleError("sending event to user", error);
    }
  }

  /**
   * Send an event to all clients of a specific session
   */
  async sendToSession(sessionId: string, event: SSEEvent): Promise<number> {
    try {
      const sessionClients = Array.from(this.clients.values()).filter(
        (client) => client.sessionId === sessionId,
      );

      let successCount = 0;
      const promises = sessionClients.map(async (client) => {
        const success = await this.send(client.id, event);
        if (success) successCount++;
      });

      await Promise.all(promises);

      log.info("Event sent to session", {
        sessionId,
        event: event.event,
        clientCount: sessionClients.length,
        successCount,
      });

      return successCount;
    } catch (error) {
      return handleError("sending event to session", error);
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  async broadcast(event: SSEEvent): Promise<number> {
    try {
      let successCount = 0;
      const promises = Array.from(this.clients.keys()).map(async (clientId) => {
        const success = await this.send(clientId, event);
        if (success) successCount++;
      });

      await Promise.all(promises);

      log.info("Event broadcasted", {
        event: event.event,
        clientCount: this.clients.size,
        successCount,
      });

      return successCount;
    } catch (error) {
      return handleError("broadcasting event", error);
    }
  }

  /**
   * Get all active clients
   */
  getActiveClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get the number of active connections
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      activeConnections: this.clients.size,
      totalConnections: this.totalConnections,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Clean up all connections and stop heartbeat
   */
  async cleanup(): Promise<void> {
    try {
      log.info("Cleaning up SSE connections", {
        activeConnections: this.clients.size,
      });

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Disconnect all clients
      const disconnectPromises = Array.from(this.clients.keys()).map(
        (clientId) => this.disconnect(clientId),
      );

      await Promise.all(disconnectPromises);

      log.info("SSE cleanup completed");
    } catch (error) {
      return handleError("cleaning up SSE connections", error);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (!this.options.heartbeat) return;

    const config = this.options.heartbeat;

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, config.interval);

    log.info("Heartbeat started", {
      interval: config.interval,
      timeout: config.timeout,
    });
  }

  /**
   * Send heartbeat to all clients and clean up stale connections
   */
  private async sendHeartbeat(): Promise<void> {
    const now = Date.now();
    const config = this.options.heartbeat!;

    // Send ping to all clients
    const pingEvent: SSEEvent = {
      id: `ping-${now}`,
      event: "ping",
      data: { timestamp: now },
      timestamp: now,
    };

    // Find stale connections
    const staleClients = Array.from(this.clients.entries())
      .filter(([, client]) => {
        const timeSinceLastPing = now - client.lastPing;
        return timeSinceLastPing > config.timeout;
      })
      .map(([clientId]) => clientId);

    // Clean up stale connections
    const cleanupPromises = staleClients.map((clientId) =>
      this.disconnect(clientId),
    );

    // Send ping to active clients
    const pingPromises = Array.from(this.clients.entries())
      .filter(([clientId]) => !staleClients.includes(clientId))
      .map(async ([clientId, client]) => {
        const success = await this.send(clientId, pingEvent);
        if (success) {
          client.lastPing = now;
        }
      });

    await Promise.all([...cleanupPromises, ...pingPromises]);

    if (staleClients.length > 0) {
      log.info("Cleaned up stale connections", {
        staleCount: staleClients.length,
        activeCount: this.clients.size,
      });
    }
  }

  /**
   * Format an SSE event according to the SSE protocol
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = "";

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    if (event.event) {
      formatted += `event: ${event.event}\n`;
    }

    if (event.data) {
      formatted += `data: ${JSON.stringify(event.data)}\n`;
    }

    formatted += "\n";

    return formatted;
  }
}

// Singleton instance
let sseConnectionManager: SSEConnectionManagerService | null = null;

/**
 * Get the singleton SSE connection manager instance
 */
export function getSSEConnectionManager(): SSEConnectionManagerService {
  if (!sseConnectionManager) {
    sseConnectionManager = new SSEConnectionManagerService();
  }
  return sseConnectionManager;
}
