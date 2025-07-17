import { logger } from "@/utils/logging";
import type { SSEClient, SSEMessage, SSEServiceType } from "./types";

/**
 * Configuration constants for SSE service
 */
const SSE_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  MAX_IDLE_TIME_MS: 300000, // 5 minutes
  CLEANUP_INTERVAL_MS: 60000, // 1 minute
} as const;

/**
 * Server-Sent Events service for managing real-time client connections.
 *
 * This service provides a centralized way to manage SSE connections,
 * send events to specific clients or broadcast to all clients,
 * and handle connection lifecycle events.
 */
class SSEService implements SSEServiceType {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly log = logger.createContextLogger("SSE");

  constructor() {
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Add a new client to the SSE service.
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    this.log.info(`Client connected: ${client.id}`, {
      userId: client.userId,
      sessionId: client.sessionId,
      totalClients: this.clients.size,
    });
  }

  /**
   * Remove a client from the SSE service.
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.isConnected = false;
      this.clients.delete(clientId);
      this.log.info(`Client disconnected: ${clientId}`, {
        totalClients: this.clients.size,
      });
    }
  }

  /**
   * Send a message to specific clients based on target criteria.
   */
  async sendMessage(message: SSEMessage): Promise<void> {
    const { event, data, target = "all", exclude = [] } = message;

    let targetClients: SSEClient[] = [];

    switch (target) {
      case "all":
        targetClients = Array.from(this.clients.values());
        break;
      default:
        if (Array.isArray(target)) {
          targetClients = Array.from(this.clients.values()).filter((client) =>
            target.includes(client.id),
          );
        }
        break;
    }

    // Filter out excluded clients
    targetClients = targetClients.filter(
      (client) => !exclude.includes(client.id),
    );

    await this.sendToClients(targetClients, event, data);
  }

  /**
   * Send an event to a specific user.
   */
  async sendToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const userClients = Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );

    await this.sendToClients(userClients, event, data);
  }

  /**
   * Broadcast an event to all connected clients.
   */
  async broadcast(
    event: string,
    data: Record<string, unknown>,
    exclude: string[] = [],
  ): Promise<void> {
    const allClients = Array.from(this.clients.values()).filter(
      (client) => !exclude.includes(client.id),
    );
    await this.sendToClients(allClients, event, data);
  }

  /**
   * Get all active clients.
   */
  getActiveClients(): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.isConnected,
    );
  }

  /**
   * Get the total number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Clean up resources and stop intervals.
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.controller.close();
      } catch (error) {
        this.log.warn(`Error closing client ${client.id}`, error);
      }
    }

    this.clients.clear();
  }

  /**
   * Send an event to a list of clients.
   */
  private async sendToClients(
    clients: SSEClient[],
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const message = this.formatSSEMessage(event, data);
    const disconnectedClients: string[] = [];

    for (const client of clients) {
      if (!client.isConnected) {
        disconnectedClients.push(client.id);
        continue;
      }

      try {
        client.controller.enqueue(new TextEncoder().encode(message));
        client.lastActivity = Date.now();
      } catch (error) {
        this.log.warn(`Failed to send message to client ${client.id}`, error);
        disconnectedClients.push(client.id);
      }
    }

    // Clean up disconnected clients
    for (const clientId of disconnectedClients) {
      this.removeClient(clientId);
    }
  }

  /**
   * Format a message for SSE transmission.
   */
  private formatSSEMessage(
    event: string,
    data: Record<string, unknown>,
  ): string {
    const id = Date.now().toString();
    const jsonData = JSON.stringify(data);

    return `id: ${id}\nevent: ${event}\ndata: ${jsonData}\n\n`;
  }

  /**
   * Start the heartbeat mechanism to keep connections alive.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      void this.broadcast("ping", { timestamp: Date.now() });
    }, SSE_CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Start the cleanup mechanism to remove idle clients.
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const idleClients: string[] = [];

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastActivity > SSE_CONFIG.MAX_IDLE_TIME_MS) {
          idleClients.push(clientId);
        }
      }

      for (const clientId of idleClients) {
        this.log.info(`Removing idle client: ${clientId}`);
        this.removeClient(clientId);
      }
    }, SSE_CONFIG.CLEANUP_INTERVAL_MS);
  }
}

/**
 * Factory function to create SSE service instances
 */
export function createSSEService(): SSEService {
  return new SSEService();
}

/**
 * Singleton instance for use throughout the application
 */
export const sseService = createSSEService();
