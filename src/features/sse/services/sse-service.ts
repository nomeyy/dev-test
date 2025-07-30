import { createServiceContext } from "@/utils/service-utils";
import { getRedis } from "@/lib/redis";
import type {
  SSEClient,
  SSEEvent,
  SSEConfig,
  SSEServiceInterface,
  SendEventOptions,
} from "@/types/sse";
import { SSE_EVENT_TYPES } from "@/types/sse";

/**
 * Server-Sent Events service implementation
 * Manages client connections, event dispatching, and heartbeat mechanism
 */
export class SSEService implements SSEServiceInterface {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly context = createServiceContext("SSEService");

  private readonly config: SSEConfig = {
    heartbeatInterval: 60000, // 60 seconds (reduced frequency)
    clientTimeout: 300000, // 5 minutes
    maxConnectionsPerUser: 5,
    redisKeyPrefix: "sse:",
  };

  constructor(config?: Partial<SSEConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startHeartbeat();
  }

  /**
   * Add a new client connection
   */
  async addClient(client: SSEClient): Promise<void> {
    try {
      // Check connection limits per user
      if (client.userId) {
        const userClients = await this.getClientsByUserId(client.userId);
        if (userClients.length >= this.config.maxConnectionsPerUser) {
          // Remove oldest connection
          const oldestClient = userClients.sort(
            (a, b) => a.connectedAt.getTime() - b.connectedAt.getTime(),
          )[0];
          if (oldestClient) {
            await this.removeClient(oldestClient.id);
          }
        }
      }

      // Add client to memory
      this.clients.set(client.id, client);

      // Store client info in Redis for persistence across server restarts
      // Skip Redis operations in development if Redis is unavailable
      const isDevelopment = process.env.NODE_ENV !== "production";
      if (!isDevelopment) {
        try {
          const redis = await getRedis();
          const clientData = {
            id: client.id,
            userId: client.userId,
            sessionId: client.sessionId,
            connectedAt: client.connectedAt.toISOString(),
            lastActivity: client.lastActivity.toISOString(),
            metadata: client.metadata ?? {},
          };

          await redis.hset(
            `${this.config.redisKeyPrefix}clients`,
            client.id,
            JSON.stringify(clientData),
          );

          // Index by user ID if available
          if (client.userId) {
            await redis.hset(
              `${this.config.redisKeyPrefix}users:${client.userId}`,
              client.id,
              "1",
            );
          }
        } catch (redisError) {
          // Redis unavailable - continue without persistence
          this.context.log.warn("Redis unavailable for client persistence", {
            clientId: client.id,
            error:
              redisError instanceof Error
                ? redisError.message
                : String(redisError),
          });
        }
      }

      this.context.log.info(`Client connected: ${client.id}`, {
        userId: client.userId,
        sessionId: client.sessionId,
      });

      // Send connection established event
      this.sendEventToClient(client, {
        type: SSE_EVENT_TYPES.CONNECTION_ESTABLISHED,
        data: { clientId: client.id, connectedAt: client.connectedAt },
        id: `conn-${client.id}`,
      });
    } catch (error) {
      this.context.handleError("addClient", error);
    }
  }

  /**
   * Remove a client connection
   */
  async removeClient(clientId: string): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      // Close the connection
      try {
        client.controller.close();
      } catch {
        // Connection might already be closed
      }

      // Remove from memory
      this.clients.delete(clientId);

      // Remove from Redis (skip in development if Redis is unavailable)
      const isDevelopment = process.env.NODE_ENV !== "production";
      if (!isDevelopment) {
        try {
          const redis = await getRedis();
          await redis.hdel(`${this.config.redisKeyPrefix}clients`, clientId);

          // Remove from user index
          if (client.userId) {
            await redis.hdel(
              `${this.config.redisKeyPrefix}users:${client.userId}`,
              clientId,
            );
          }
        } catch (redisError) {
          // Redis unavailable - continue without persistence cleanup
          this.context.log.warn("Redis unavailable for client cleanup", {
            clientId,
            error:
              redisError instanceof Error
                ? redisError.message
                : String(redisError),
          });
        }
      }

      this.context.log.info(`Client disconnected: ${clientId}`, {
        userId: client.userId,
        sessionId: client.sessionId,
      });
    } catch (error) {
      this.context.log.error("Failed to remove client", error, { clientId });
    }
  }

  /**
   * Send event to clients based on options
   */
  async sendEvent(event: SSEEvent, options: SendEventOptions): Promise<void> {
    try {
      const targetClients = await this.getTargetClients(options);

      if (targetClients.length === 0) {
        this.context.log.warn("No target clients found for event", {
          eventType: event.type,
          options,
        });
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      for (const client of targetClients) {
        try {
          this.sendEventToClient(client, event);
          successCount++;
        } catch (error) {
          failureCount++;
          this.context.log.error("Failed to send event to client", error, {
            clientId: client.id,
            eventType: event.type,
          });
          // Remove client if connection is broken
          await this.removeClient(client.id);
        }
      }

      this.context.log.info(`Event sent: ${event.type}`, {
        targetCount: targetClients.length,
        successCount,
        failureCount,
      });
    } catch (error) {
      this.context.handleError("sendEvent", error);
    }
  }

  /**
   * Get all connected clients
   */
  async getClients(): Promise<SSEClient[]> {
    return Array.from(this.clients.values());
  }

  /**
   * Get clients for a specific user
   */
  async getClientsByUserId(userId: string): Promise<SSEClient[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  /**
   * Cleanup disconnected clients and expired connections
   */
  async cleanup(): Promise<void> {
    try {
      const now = new Date();
      const expiredClients: string[] = [];

      for (const [clientId, client] of this.clients) {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        if (timeSinceActivity > this.config.clientTimeout) {
          expiredClients.push(clientId);
        }
      }

      for (const clientId of expiredClients) {
        await this.removeClient(clientId);
      }

      if (expiredClients.length > 0) {
        this.context.log.info(
          `Cleaned up ${expiredClients.length} expired clients`,
        );
      }
    } catch (error) {
      this.context.log.error("Failed to cleanup clients", error);
    }
  }

  /**
   * Update client activity timestamp
   */
  async updateClientActivity(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  /**
   * Start heartbeat mechanism to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const heartbeatEvent: SSEEvent = {
        type: SSE_EVENT_TYPES.HEARTBEAT,
        data: { timestamp: new Date().toISOString() },
      };

      await this.sendEvent(heartbeatEvent, { broadcast: true });
      await this.cleanup();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get target clients based on send options
   */
  private async getTargetClients(
    options: SendEventOptions,
  ): Promise<SSEClient[]> {
    let targetClients: SSEClient[] = [];

    if (options.broadcast) {
      targetClients = Array.from(this.clients.values());
    } else {
      // Target specific clients
      if (options.clientIds) {
        for (const clientId of options.clientIds) {
          const client = this.clients.get(clientId);
          if (client) {
            targetClients.push(client);
          }
        }
      }

      // Target by user IDs
      if (options.userIds) {
        for (const userId of options.userIds) {
          const userClients = await this.getClientsByUserId(userId);
          targetClients.push(...userClients);
        }
      }

      // Target by session IDs
      if (options.sessionIds) {
        const sessionClients = Array.from(this.clients.values()).filter(
          (client) =>
            client.sessionId && options.sessionIds!.includes(client.sessionId),
        );
        targetClients.push(...sessionClients);
      }
    }

    // Remove duplicates
    const uniqueClients = new Map<string, SSEClient>();
    for (const client of targetClients) {
      uniqueClients.set(client.id, client);
    }

    // Apply exclusions
    if (options.excludeClientIds) {
      for (const excludeId of options.excludeClientIds) {
        uniqueClients.delete(excludeId);
      }
    }

    return Array.from(uniqueClients.values());
  }

  /**
   * Send event to a specific client
   */
  private sendEventToClient(client: SSEClient, event: SSEEvent): void {
    const sseData = this.formatSSEData(event);

    try {
      client.controller.enqueue(sseData);
      client.lastActivity = new Date();
    } catch (error) {
      throw new Error(
        `Failed to send event to client ${client.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Format event data according to SSE specification
   */
  private formatSSEData(event: SSEEvent): string {
    let sseString = "";

    if (event.id) {
      sseString += `id: ${event.id}\n`;
    }

    if (event.type) {
      sseString += `event: ${event.type}\n`;
    }

    if (event.retry) {
      sseString += `retry: ${event.retry}\n`;
    }

    // Handle multi-line data
    const dataString =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);

    const dataLines = dataString.split("\n");
    for (const line of dataLines) {
      sseString += `data: ${line}\n`;
    }

    sseString += "\n"; // Double newline to end the event
    return sseString;
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    this.context.log.info("Shutting down SSE service");

    this.stopHeartbeat();

    // Close all client connections
    for (const [clientId] of this.clients) {
      await this.removeClient(clientId);
    }

    this.context.log.info("SSE service shutdown complete");
  }
}

// Export singleton instance
export const sseService = new SSEService();
