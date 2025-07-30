import { createServiceContext } from "../../../utils/service-utils";
import type {
  SSEClient,
  SSEMessage,
  SSEConnectionOptions,
  SSEManagerStats,
} from "../types";

const { log, handleError } = createServiceContext("SSEManager");

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 120000; // 2 minutes

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new client connection
   */
  addClient(
    connection: ReadableStreamDefaultController,
    options: SSEConnectionOptions = {},
  ): string {
    const clientId = options.clientId || this.generateClientId();

    const client: SSEClient = {
      id: clientId,
      userId: options.userId,
      sessionId: options.sessionId,
      connection,
      lastHeartbeat: Date.now(),
      isAlive: true,
    };

    this.clients.set(clientId, client);

    log.info("Client connected", {
      clientId,
      userId: options.userId,
      sessionId: options.sessionId,
      totalConnections: this.clients.size,
    });

    // Send initial connection confirmation
    this.sendToClient(clientId, {
      event: "connected",
      data: { clientId, timestamp: Date.now() },
    });

    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      client.connection.close();
    } catch (error) {
      log.warn("Error closing client connection", { clientId, error });
    }

    this.clients.delete(clientId);

    log.info("Client disconnected", {
      clientId,
      userId: client.userId,
      sessionId: client.sessionId,
      totalConnections: this.clients.size,
    });

    return true;
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(clientId: string, message: SSEMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || !client.isAlive) {
      return false;
    }

    try {
      const sseEvent = this.formatSSEEvent(message);
      client.connection.enqueue(new TextEncoder().encode(sseEvent));
      return true;
    } catch (error) {
      log.error("Error sending message to client", { clientId, error });
      // Mark client as dead and remove it
      client.isAlive = false;
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send a message to all clients
   */
  broadcast(message: SSEMessage): number {
    log.info("Broadcasting message", {
      event: message.event,
      totalClients: this.clients.size,
    });

    let sentCount = 0;
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      log.info("Processing client for broadcast", {
        clientId,
        isAlive: client.isAlive,
        userId: client.userId,
      });

      if (!client.isAlive) {
        deadClients.push(clientId);
        continue;
      }

      if (this.sendToClient(clientId, message)) {
        sentCount++;
        log.info("Message sent successfully to client", { clientId });
      } else {
        deadClients.push(clientId);
        log.warn("Failed to send message to client", { clientId });
      }
    }

    // Clean up dead clients
    deadClients.forEach((clientId) => this.removeClient(clientId));

    log.info("Broadcast message sent", {
      event: message.event,
      sentCount,
      totalClients: this.clients.size,
    });

    return sentCount;
  }

  /**
   * Send a message to all clients of a specific user
   */
  sendToUser(userId: string, message: SSEMessage): number {
    let sentCount = 0;
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.isAlive) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        } else {
          deadClients.push(clientId);
        }
      }
    }

    // Clean up dead clients
    deadClients.forEach((clientId) => this.removeClient(clientId));

    log.info("User message sent", {
      userId,
      event: message.event,
      sentCount,
    });

    return sentCount;
  }

  /**
   * Send a message to all clients of a specific session
   */
  sendToSession(sessionId: string, message: SSEMessage): number {
    let sentCount = 0;
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.sessionId === sessionId && client.isAlive) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        } else {
          deadClients.push(clientId);
        }
      }
    }

    // Clean up dead clients
    deadClients.forEach((clientId) => this.removeClient(clientId));

    log.info("Session message sent", {
      sessionId,
      event: message.event,
      sentCount,
    });

    return sentCount;
  }

  /**
   * Update client heartbeat
   */
  updateHeartbeat(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    client.lastHeartbeat = Date.now();
    return true;
  }

  /**
   * Get manager statistics
   */
  getStats(): SSEManagerStats {
    const connectionsByUser: Record<string, number> = {};
    const connectionsBySession: Record<string, number> = {};
    let activeConnections = 0;

    for (const client of this.clients.values()) {
      if (client.isAlive) {
        activeConnections++;

        if (client.userId) {
          connectionsByUser[client.userId] =
            (connectionsByUser[client.userId] || 0) + 1;
        }

        if (client.sessionId) {
          connectionsBySession[client.sessionId] =
            (connectionsBySession[client.sessionId] || 0) + 1;
        }
      }
    }

    return {
      totalConnections: this.clients.size,
      activeConnections,
      connectionsByUser,
      connectionsBySession,
    };
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    log.info("Cleaning up SSE manager", {
      totalConnections: this.clients.size,
    });

    for (const [clientId] of this.clients) {
      this.removeClient(clientId);
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Perform heartbeat check and cleanup
   */
  private performHeartbeat(): void {
    const now = Date.now();
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (now - client.lastHeartbeat > this.CLIENT_TIMEOUT) {
        client.isAlive = false;
        deadClients.push(clientId);
      } else {
        // Send heartbeat to keep connection alive
        try {
          client.connection.enqueue(
            new TextEncoder().encode(": heartbeat\n\n"),
          );
        } catch (error) {
          log.warn("Error sending heartbeat", { clientId, error });
          client.isAlive = false;
          deadClients.push(clientId);
        }
      }
    }

    // Clean up dead clients
    deadClients.forEach((clientId) => this.removeClient(clientId));

    if (deadClients.length > 0) {
      log.info("Heartbeat cleanup completed", {
        removedClients: deadClients.length,
        remainingClients: this.clients.size,
      });
    }
  }

  /**
   * Format message as SSE event
   */
  private formatSSEEvent(message: SSEMessage): string {
    const lines = [
      `event: ${message.event}`,
      `data: ${JSON.stringify(message.data)}`,
      `id: ${Date.now()}`,
      "",
      "",
    ];
    return lines.join("\n");
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const sseManager = new SSEManager();

// Cleanup on process exit
process.on("SIGINT", () => {
  sseManager.cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  sseManager.cleanup();
  process.exit(0);
});
