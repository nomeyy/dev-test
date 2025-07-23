import { MemorySSEService } from "./services/memory-sse-service";
import type {
  SSEService,
  SSEEvent,
  SSEBroadcastOptions,
  SSEManagerConfig,
  SSEClient,
} from "./types";
import { logger } from "@/utils/logging";

/**
 * Centralized SSE Manager for handling real-time notifications.
 * This is the main interface that backend modules should use to send SSE events.
 */
export class SSEManager {
  private static instance: SSEManager | null = null;
  private service: SSEService;

  private constructor(config?: SSEManagerConfig) {
    this.service = new MemorySSEService(config);
  }

  /**
   * Get or create the singleton SSE manager instance.
   */
  static getInstance(config?: SSEManagerConfig): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager(config);
      logger.info("SSE_MANAGER", "SSE Manager initialized");
    }
    return SSEManager.instance;
  }

  /**
   * Add a new SSE client connection.
   */
  async addClient(client: SSEClient): Promise<void> {
    return this.service.addClient(client);
  }

  /**
   * Remove an SSE client connection.
   */
  async removeClient(clientId: string): Promise<void> {
    return this.service.removeClient(clientId);
  }

  /**
   * Get information about a specific client.
   */
  async getClient(clientId: string): Promise<SSEClient | null> {
    return this.service.getClient(clientId);
  }

  /**
   * Send an event to a specific client.
   *
   * @param clientId - The ID of the client to send to
   * @param event - The event to send
   * @returns Promise<boolean> - true if sent successfully
   */
  async sendToClient(clientId: string, event: SSEEvent): Promise<boolean> {
    return this.service.sendToClient(clientId, event);
  }

  /**
   * Send an event to a specific user (all their connected clients).
   *
   * @param userId - The ID of the user to send to
   * @param event - The event to send
   * @returns Promise<number> - number of clients the event was sent to
   */
  async sendToUser(userId: string, event: SSEEvent): Promise<number> {
    return this.service.broadcast(event, { userIds: [userId] });
  }

  /**
   * Broadcast an event to multiple clients based on criteria.
   *
   * @param event - The event to broadcast
   * @param options - Filtering options for targeting specific clients
   * @returns Promise<number> - number of clients the event was sent to
   */
  async broadcast(
    event: SSEEvent,
    options?: SSEBroadcastOptions,
  ): Promise<number> {
    return this.service.broadcast(event, options);
  }

  /**
   * Broadcast an event to all connected clients.
   *
   * @param event - The event to broadcast
   * @returns Promise<number> - number of clients the event was sent to
   */
  async broadcastToAll(event: SSEEvent): Promise<number> {
    return this.service.broadcast(event);
  }

  /**
   * Get all currently active clients.
   */
  async getActiveClients(): Promise<SSEClient[]> {
    return this.service.getActiveClients();
  }

  /**
   * Get statistics about the SSE service.
   */
  async getStats(): Promise<{
    totalClients: number;
    clientsByUser: Record<string, number>;
  }> {
    const clients = await this.service.getActiveClients();
    const clientsByUser: Record<string, number> = {};

    for (const client of clients) {
      if (client.userId) {
        clientsByUser[client.userId] = (clientsByUser[client.userId] ?? 0) + 1;
      }
    }

    return {
      totalClients: clients.length,
      clientsByUser,
    };
  }

  /**
   * Clean up all resources. Should be called on application shutdown.
   */
  async cleanup(): Promise<void> {
    await this.service.cleanup();
    SSEManager.instance = null;
    logger.info("SSE_MANAGER", "SSE Manager cleaned up");
  }

  // Utility methods for common notification patterns

  /**
   * Send a notification event to a user.
   */
  async notifyUser(
    userId: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ): Promise<number> {
    return this.sendToUser(userId, {
      event: "notification",
      data: {
        type,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send a real-time update event to all clients.
   */
  async sendUpdate(data: unknown, event = "update"): Promise<number> {
    return this.broadcastToAll({
      event,
      data,
    });
  }

  /**
   * Send a system announcement to all connected clients.
   */
  async announce(
    message: string,
    priority: "low" | "medium" | "high" = "medium",
  ): Promise<number> {
    return this.broadcastToAll({
      event: "announcement",
      data: {
        message,
        priority,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
