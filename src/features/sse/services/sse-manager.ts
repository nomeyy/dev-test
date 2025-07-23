import { getRedis } from "@/lib/redis";
import { logger } from "@/utils/logging";
import type {
  SSEClient,
  SSEEvent,
  SSEManagerConfig,
  SSEMessage,
  SSEClientStats,
  SSEError,
} from "../types";

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: SSEManagerConfig;
  private redis: any = null;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      maxConnections: 1000,
      connectionTimeout: 300000, // 5 minutes
      enableRedis: false,
      redisChannel: "sse-events",
      ...config,
    };

    this.initializeRedis();
    this.startHeartbeat();
    this.startConnectionCleanup();
  }

  private async initializeRedis() {
    if (this.config.enableRedis) {
      try {
        this.redis = await getRedis();
        this.setupRedisSubscription();
        logger.info("SSE", "Redis integration enabled");
      } catch (error) {
        logger.error("SSE", "Failed to initialize Redis for SSE", error);
      }
    }
  }

  private setupRedisSubscription() {
    if (!this.redis) return;

    // In a real implementation, you'd set up Redis pub/sub
    // For now, we'll use polling to check for messages
    setInterval(async () => {
      try {
        // This is a simplified implementation
        // In production, you'd use Redis pub/sub channels
        const messages = await this.redis.lrange(
          `${this.config.redisChannel}:queue`,
          0,
          10,
        );
        for (const message of messages) {
          if (message) {
            const parsedMessage = JSON.parse(message as string);
            await this.handleRedisMessage(parsedMessage);
          }
        }
      } catch (error) {
        logger.error("SSE", "Error processing Redis messages", error);
      }
    }, 1000);
  }

  private async handleRedisMessage(message: SSEMessage) {
    switch (message.target) {
      case "all":
        await this.broadcast(message.event!, message.data);
        break;
      case "user":
        await this.sendToUser(message.targetId!, message.event!, message.data);
        break;
      case "session":
        await this.sendToSession(
          message.targetId!,
          message.event!,
          message.data,
        );
        break;
      case "client":
        await this.sendToClient(
          message.targetId!,
          message.event!,
          message.data,
        );
        break;
    }
  }

  public async addClient(client: SSEClient): Promise<void> {
    if (this.clients.size >= this.config.maxConnections!) {
      throw new Error("Maximum connections reached");
    }

    this.clients.set(client.id, client);

    // Send initial connection event
    await this.sendToClient(client.id, "connected", {
      clientId: client.id,
      timestamp: Date.now(),
    });

    logger.info("SSE", `Client connected: ${client.id}`, {
      userId: client.userId,
      totalConnections: this.clients.size,
    });
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.close();
      this.clients.delete(clientId);

      logger.info("SSE", `Client disconnected: ${clientId}`, {
        userId: client.userId,
        totalConnections: this.clients.size,
      });
    }
  }

  public async sendToClient(
    clientId: string,
    event: string,
    data: any,
  ): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client || !client.isConnected) {
      return false;
    }

    try {
      const sseEvent: SSEEvent = {
        id: `${clientId}-${Date.now()}`,
        event,
        data,
        timestamp: Date.now(),
      };

      const sseData = this.formatSSEEvent(sseEvent);
      client.send(sseData);
      client.lastActivity = Date.now();

      return true;
    } catch (error) {
      logger.error("SSE", `Failed to send event to client ${clientId}`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  public async sendToUser(
    userId: string,
    event: string,
    data: any,
  ): Promise<number> {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.isConnected) {
        const sent = await this.sendToClient(clientId, event, data);
        if (sent) sentCount++;
      }
    }

    logger.info(
      "SSE",
      `Sent event to ${sentCount} clients for user ${userId}`,
      { event },
    );
    return sentCount;
  }

  public async sendToSession(
    sessionId: string,
    event: string,
    data: any,
  ): Promise<number> {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (client.sessionId === sessionId && client.isConnected) {
        const sent = await this.sendToClient(clientId, event, data);
        if (sent) sentCount++;
      }
    }

    logger.info(
      "SSE",
      `Sent event to ${sentCount} clients for session ${sessionId}`,
      { event },
    );
    return sentCount;
  }

  public async broadcast(event: string, data: any): Promise<number> {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (client.isConnected) {
        const sent = await this.sendToClient(clientId, event, data);
        if (sent) sentCount++;
      }
    }

    logger.info("SSE", `Broadcasted event to ${sentCount} clients`, { event });
    return sentCount;
  }

  public async publishToRedis(message: SSEMessage): Promise<void> {
    if (!this.redis || !this.config.enableRedis) {
      return;
    }

    try {
      await this.redis.lpush(
        `${this.config.redisChannel}:queue`,
        JSON.stringify(message),
      );
    } catch (error) {
      logger.error("SSE", "Failed to publish message to Redis", error);
    }
  }

  private formatSSEEvent(event: SSEEvent): string {
    let sseData = "";

    if (event.id) {
      sseData += `id: ${event.id}\n`;
    }

    sseData += `event: ${event.event}\n`;
    sseData += `data: ${JSON.stringify(event.data)}\n`;

    if (event.retry) {
      sseData += `retry: ${event.retry}\n`;
    }

    sseData += "\n";
    return sseData;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast("heartbeat", { timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  private startConnectionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.config.connectionTimeout!;

      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity > timeout) {
          logger.warn("SSE", `Removing inactive client: ${clientId}`);
          this.removeClient(clientId);
        }
      }
    }, 60000); // Check every minute
  }

  public getStats(): SSEClientStats {
    const connectionsByUser: Record<string, number> = {};

    for (const client of this.clients.values()) {
      if (client.userId) {
        connectionsByUser[client.userId] =
          (connectionsByUser[client.userId] || 0) + 1;
      }
    }

    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(
        (c) => c.isConnected,
      ).length,
      connectionsByUser,
      lastActivity: Math.max(
        ...Array.from(this.clients.values()).map((c) => c.lastActivity),
        0,
      ),
    };
  }

  public getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  public getClientsByUser(userId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  public getClientsBySession(sessionId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.sessionId === sessionId,
    );
  }

  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const client of this.clients.values()) {
      client.close();
    }

    this.clients.clear();
    logger.info("SSE", "Manager disconnected all clients");
  }
}

// Singleton instance
let sseManager: SSEManager | null = null;

export function getSSEManager(config?: SSEManagerConfig): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager(config);
  }
  return sseManager;
}
