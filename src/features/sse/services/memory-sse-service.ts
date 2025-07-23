import { logger } from "@/utils/logging";
import type {
  SSEClient,
  SSEEvent,
  SSEService,
  SSEBroadcastOptions,
  SSEManagerConfig,
} from "../types";

/**
 * In-memory SSE service implementation.
 * For production, consider using Redis or another persistent store for multi-instance deployment.
 */
export class MemorySSEService implements SSEService {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEManagerConfig>;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 60000, // 60 seconds
      maxConnections: config.maxConnections ?? 1000,
      enableLogging: config.enableLogging ?? true,
    };

    this.startHeartbeat();
  }

  async addClient(client: SSEClient): Promise<void> {
    if (this.clients.size >= this.config.maxConnections) {
      throw new Error(
        `Maximum connections reached: ${this.config.maxConnections}`,
      );
    }

    this.clients.set(client.id, client);

    if (this.config.enableLogging) {
      logger.info(
        "SSE_SERVICE",
        `Client connected: ${client.id}${client.userId ? ` (user: ${client.userId})` : ""}`,
        {
          clientId: client.id,
          userId: client.userId,
          totalClients: this.clients.size,
        },
      );
    }

    // Send initial connection confirmation
    await this.sendToClient(client.id, {
      event: "connected",
      data: { clientId: client.id, timestamp: new Date().toISOString() },
    });
  }

  async removeClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Close the stream gracefully
      client.controller.close();
    } catch (error) {
      if (this.config.enableLogging) {
        logger.warn(
          "SSE_SERVICE",
          `Error closing client stream: ${clientId}`,
          error,
        );
      }
    }

    this.clients.delete(clientId);

    if (this.config.enableLogging) {
      logger.info(
        "SSE_SERVICE",
        `Client disconnected: ${clientId}${client.userId ? ` (user: ${client.userId})` : ""}`,
        { clientId, userId: client.userId, totalClients: this.clients.size },
      );
    }
  }

  async getClient(clientId: string): Promise<SSEClient | null> {
    return this.clients.get(clientId) ?? null;
  }

  async sendToClient(clientId: string, event: SSEEvent): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client) {
      if (this.config.enableLogging) {
        logger.warn(
          "SSE_SERVICE",
          `Attempted to send to non-existent client: ${clientId}`,
        );
      }
      return false;
    }

    try {
      const sseMessage = this.formatSSEMessage(event);
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(sseMessage));
      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        logger.error(
          "SSE_SERVICE",
          `Error sending to client ${clientId}:`,
          error,
        );
      }
      // Remove client if stream is broken
      await this.removeClient(clientId);
      return false;
    }
  }

  async broadcast(
    event: SSEEvent,
    options: SSEBroadcastOptions = {},
  ): Promise<number> {
    const targetClients = this.filterClients(options);
    let successCount = 0;

    const promises = targetClients.map(async (client) => {
      const success = await this.sendToClient(client.id, event);
      if (success) successCount++;
    });

    await Promise.all(promises);

    if (this.config.enableLogging) {
      logger.info(
        "SSE_SERVICE",
        `Broadcast sent to ${successCount}/${targetClients.length} clients`,
        {
          event: event.event,
          successCount,
          totalTargets: targetClients.length,
        },
      );
    }

    return successCount;
  }

  async getActiveClients(): Promise<SSEClient[]> {
    return Array.from(this.clients.values());
  }

  async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    const promises = Array.from(this.clients.keys()).map((clientId) =>
      this.removeClient(clientId),
    );
    await Promise.all(promises);

    if (this.config.enableLogging) {
      logger.info("SSE_SERVICE", "Service cleaned up");
    }
  }

  private filterClients(options: SSEBroadcastOptions): SSEClient[] {
    let clients = Array.from(this.clients.values());

    // Filter by user IDs
    if (options.userIds?.length) {
      clients = clients.filter(
        (client) => client.userId && options.userIds!.includes(client.userId),
      );
    }

    // Filter by specific client IDs
    if (options.clientIds?.length) {
      clients = clients.filter((client) =>
        options.clientIds!.includes(client.id),
      );
    }

    // Exclude specific client IDs
    if (options.excludeClientIds?.length) {
      clients = clients.filter(
        (client) => !options.excludeClientIds!.includes(client.id),
      );
    }

    // TODO: Implement topic-based filtering when needed
    // if (options.topics?.length) {
    //   clients = clients.filter(client =>
    //     client.topics?.some(topic => options.topics!.includes(topic))
    //   );
    // }

    return clients;
  }

  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    // Handle data serialization
    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);

    message += `data: ${data}\n\n`;

    return message;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      void this.performHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private async performHeartbeat(): Promise<void> {
    const now = new Date();
    const timeoutThreshold = new Date(
      now.getTime() - this.config.connectionTimeout,
    );

    // Send heartbeat to all clients and check for timeouts
    const clientsToRemove: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      // Check if client has timed out
      if (client.lastPing < timeoutThreshold) {
        clientsToRemove.push(clientId);
        continue;
      }

      // Send heartbeat
      const success = await this.sendToClient(clientId, {
        event: "heartbeat",
        data: { timestamp: now.toISOString() },
      });

      if (!success) {
        clientsToRemove.push(clientId);
      } else {
        // Update last ping time
        client.lastPing = now;
      }
    }

    // Remove timed out or failed clients
    for (const clientId of clientsToRemove) {
      await this.removeClient(clientId);
    }
  }
}
