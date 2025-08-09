import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEManager,
  SSEClient,
  SSEEventType,
  SSEEventData,
  SendEventOptions,
} from "./types";

const { log, handleError } = createServiceContext("SSE-Manager");

/**
 * Centralized SSE Manager for handling client connections and event dispatching
 */
class SSEManagerImpl implements SSEManager {
  private clients = new Map<string, SSEClient[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Set up periodic cleanup of stale connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Clean up every minute
  }

  /**
   * Register a new client connection
   */
  registerClient(
    userId: string,
    clientId: string,
    controller: ReadableStreamDefaultController,
  ): SSEClient {
    const client: SSEClient = {
      userId,
      clientId,
      controller,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    // Get or create user's client list
    const userClients = this.clients.get(userId) ?? [];
    userClients.push(client);
    this.clients.set(userId, userClients);

    log.info("Client registered", {
      userId,
      clientId,
      totalConnections: this.getConnectionCount(),
    });
    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(userId: string, clientId: string): boolean {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return false;
    }

    const initialLength = userClients.length;
    const filteredClients = userClients.filter(
      (client) => client.clientId !== clientId,
    );

    if (filteredClients.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, filteredClients);
    }

    const removed = initialLength !== filteredClients.length;
    if (removed) {
      log.info("Client removed", {
        userId,
        clientId,
        totalConnections: this.getConnectionCount(),
      });
    }

    return removed;
  }

  /**
   * Send an event to specific clients or broadcast
   */
  async sendEvent(options: SendEventOptions): Promise<void> {
    const { eventType, data, eventId, targetUsers, broadcast } = options;

    try {
      if (broadcast) {
        await this.broadcast(eventType, data, eventId);
      } else if (targetUsers && targetUsers.length > 0) {
        await Promise.all(
          targetUsers.map((userId) =>
            this.sendToUser(userId, eventType, data, eventId),
          ),
        );
      } else {
        log.warn("No target specified for event", { eventType, eventId });
      }
    } catch (error) {
      handleError("sending SSE event", error);
    }
  }

  /**
   * Send an event to a specific user
   */
  async sendToUser(
    userId: string,
    eventType: SSEEventType,
    data: SSEEventData,
    eventId?: string,
  ): Promise<void> {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.length === 0) {
      log.debug("No active connections for user", { userId, eventType });
      return;
    }

    const event = this.formatSSEEvent(eventType, data, eventId);
    const encoder = new TextEncoder();

    // Send to all of user's connections
    const sendPromises = userClients.map(async (client) => {
      try {
        client.controller.enqueue(encoder.encode(event));
        client.lastActivity = new Date();
      } catch (error) {
        log.error("Failed to send event to client", {
          userId,
          clientId: client.clientId,
          error,
        });
        // Mark client for removal
        this.removeClient(userId, client.clientId);
      }
    });

    await Promise.all(sendPromises);
    log.debug("Event sent to user", {
      userId,
      eventType,
      clientCount: userClients.length,
    });
  }

  /**
   * Broadcast an event to all connected clients
   */
  async broadcast(
    eventType: SSEEventType,
    data: SSEEventData,
    eventId?: string,
  ): Promise<void> {
    const event = this.formatSSEEvent(eventType, data, eventId);
    const encoder = new TextEncoder();

    const sendPromises: Promise<void>[] = [];

    for (const [userId, userClients] of this.clients.entries()) {
      for (const client of userClients) {
        sendPromises.push(
          (async () => {
            try {
              client.controller.enqueue(encoder.encode(event));
              client.lastActivity = new Date();
            } catch (error) {
              log.error("Failed to broadcast event to client", {
                userId,
                clientId: client.clientId,
                error,
              });
              this.removeClient(userId, client.clientId);
            }
          })(),
        );
      }
    }

    await Promise.all(sendPromises);
    log.info("Event broadcasted", {
      eventType,
      totalClients: this.getConnectionCount(),
    });
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): Map<string, SSEClient[]> {
    return new Map(this.clients);
  }

  /**
   * Get total number of active connections
   */
  getConnectionCount(): number {
    let count = 0;
    for (const userClients of this.clients.values()) {
      count += userClients.length;
    }
    return count;
  }

  /**
   * Clean up stale connections and perform maintenance
   */
  cleanup(): void {
    this.cleanupStaleConnections();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Reset the manager state (for testing purposes)
   */
  reset(): void {
    this.clients.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Format SSE event according to the SSE protocol
   */
  private formatSSEEvent(
    eventType: SSEEventType,
    data: SSEEventData,
    eventId?: string,
  ): string {
    let event = `event: ${eventType}\n`;

    if (eventId) {
      event += `id: ${eventId}\n`;
    }

    event += `data: ${JSON.stringify(data)}\n\n`;
    return event;
  }

  /**
   * Clean up stale connections (older than 5 minutes without activity)
   */
  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, userClients] of this.clients.entries()) {
      const activeClients = userClients.filter((client) => {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        return timeSinceActivity < staleThreshold;
      });

      if (activeClients.length === 0) {
        this.clients.delete(userId);
        log.info("Removed all stale connections for user", { userId });
      } else if (activeClients.length !== userClients.length) {
        this.clients.set(userId, activeClients);
        const removedCount = userClients.length - activeClients.length;
        log.info("Removed stale connections", { userId, removedCount });
      }
    }
  }
}

// Export singleton instance
export const sseManager = new SSEManagerImpl();
