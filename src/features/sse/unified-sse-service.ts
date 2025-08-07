// features/sse/unified-sse-service.ts
import { getRedis, getRedisSubscriber } from "@/lib/redis";
import { logger } from "@/utils/logging";

const sseLogger = logger.createContextLogger("UnifiedSSE");

// Types
export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  response: {
    write: (chunk: string) => void;
    close?: () => void;
  };
  connectedAt: number;
  lastActivity: number;
  ip?: string;
  userAgent?: string;
}

export interface SSEEvent {
  event: string;
  data: unknown;
  timestamp: number;
  clientId?: string;
  userId?: string;
  sessionId?: string;
}

export interface SSEServiceOptions {
  heartbeatInterval?: number;
  clientTimeout?: number;
  maxQueueSize?: number;
  defaultTTL?: number;
  enableRedisSync?: boolean;
}

export interface IUnifiedSSEService {
  // Connection Management
  addClient(
    client: Omit<SSEClient, "connectedAt" | "lastActivity">,
  ): Promise<void>;
  removeClient(clientId: string): Promise<void>;
  getClient(clientId: string): SSEClient | null;
  getAllClients(): SSEClient[];
  getClientsByUserId(userId: string): SSEClient[];
  isClientConnected(clientId: string): boolean;

  // Event Broadcasting
  sendToClient(
    clientId: string,
    event: string,
    data: unknown,
  ): Promise<boolean>;
  broadcast(event: string, data: unknown): Promise<number>;

  // Queue Management
  queueEvent(
    clientId: string,
    event: string,
    data: unknown,
    ttl?: number,
  ): Promise<void>;
  getQueuedEvents(clientId: string): Promise<SSEEvent[]>;
  clearQueue(clientId: string): Promise<void>;

  // Health & Monitoring
  startHeartbeat(): void;
  stopHeartbeat(): void;
  // Cleanup
  cleanup(): Promise<void>;
}

class UnifiedSSEService implements IUnifiedSSEService {
  private clients = new Map<string, SSEClient>();
  private heartbeatTimer?: NodeJS.Timeout;
  private redisSubscriber?: any;
  private startTime = Date.now();
  private heartbeatsSent = 0;
  private isInitialized = false;

  constructor(private options: SSEServiceOptions = {}) {
    this.options = {
      heartbeatInterval: 20000, // 20 seconds
      clientTimeout: 60000, // 1 minute
      maxQueueSize: 100,
      defaultTTL: 3600, // 1 hour
      enableRedisSync: true,
      ...options,
    };
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.options.enableRedisSync) {
        await this.setupRedisSync();
      }
      this.startHeartbeat();
      this.isInitialized = true;
      sseLogger.info("UnifiedSSEService initialized", {
        redisSync: this.options.enableRedisSync,
        heartbeatInterval: this.options.heartbeatInterval,
      });
    } catch (error) {
      sseLogger.error("Failed to initialize SSE service", error);
      throw error;
    }
  }

  private async setupRedisSync(): Promise<void> {
    try {
      this.redisSubscriber = await getRedisSubscriber();
      await this.redisSubscriber.subscribe("sse-events");

      this.redisSubscriber.on("message", (channel: string, message: string) => {
        if (channel === "sse-events") {
          try {
            const event: SSEEvent = JSON.parse(message);
            this.handleRedisEvent(event);
          } catch (error) {
            sseLogger.error("Failed to parse Redis event", error);
          }
        }
      });
    } catch (error) {
      sseLogger.warn(
        "Redis sync setup failed, falling back to local-only",
        error,
      );
      this.options.enableRedisSync = false;
    }
  }

  private handleRedisEvent(event: SSEEvent): void {
    if (event.clientId) {
      this.sendToClientLocal(event.clientId, event.event, event.data);
    } else {
      this.broadcastLocal(event.event, event.data);
    }
  }

  async addClient(
    clientData: Omit<SSEClient, "connectedAt" | "lastActivity">,
  ): Promise<void> {
    await this.initialize();

    const client: SSEClient = {
      ...clientData,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.clients.set(client.id, client);

    // Send connection confirmation
    this.sendToClientLocal(client.id, "connected", {
      message: "SSE connection established",
      clientId: client.id,
      timestamp: Date.now(),
    });

    // Deliver any queued events
    try {
      const queuedEvents = await this.getQueuedEvents(client.id);
      for (const event of queuedEvents) {
        await this.sendToClientLocal(client.id, event.event, event.data);
      }
      if (queuedEvents.length > 0) {
        sseLogger.info(
          `Delivered ${queuedEvents.length} queued events to ${client.id}`,
        );
      }
    } catch (error) {
      sseLogger.error("Failed to deliver queued events", error);
    }

    sseLogger.info(`Client connected: ${client.id}`, {
      userId: client.userId,
      sessionId: client.sessionId,
      ip: client.ip,
    });
  }

  async removeClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);

    try {
      client.response.close?.();
    } catch (error) {
      // Ignore close errors
    }

    sseLogger.info(`Client disconnected: ${clientId}`, {
      userId: client.userId,
      sessionId: client.sessionId,
      connectionDuration: Date.now() - client.connectedAt,
    });
  }

  getClient(clientId: string): SSEClient | null {
    return this.clients.get(clientId) || null;
  }

  getAllClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  getClientsByUserId(userId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  isClientConnected(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  async sendToClient(
    clientId: string,
    event: string,
    data: unknown,
  ): Promise<boolean> {
    // Try local first
    const success = await this.sendToClientLocal(clientId, event, data);

    // If not found locally and Redis sync is enabled, publish to Redis
    if (!success && this.options.enableRedisSync) {
      try {
        const redis = await getRedis();
        await redis.publish(
          "sse-events",
          JSON.stringify({
            event,
            data,
            clientId,
            timestamp: Date.now(),
          }),
        );
        return true;
      } catch (error) {
        sseLogger.error("Failed to publish to Redis", error);
        // Queue the event if client might be offline
        await this.queueEvent(clientId, event, data);
        return false;
      }
    }

    return success;
  }

  private async sendToClientLocal(
    clientId: string,
    event: string,
    data: unknown,
  ): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.response.write(message);
      client.lastActivity = Date.now();
      return true;
    } catch (error) {
      sseLogger.error(`Failed to send to client ${clientId}`, error);
      await this.removeClient(clientId);
      return false;
    }
  }

  async broadcast(event: string, data: unknown): Promise<number> {
    const localCount = this.broadcastLocal(event, data);

    if (this.options.enableRedisSync) {
      try {
        const redis = await getRedis();
        await redis.publish(
          "sse-events",
          JSON.stringify({
            event,
            data,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        sseLogger.error("Failed to publish broadcast to Redis", error);
      }
    }

    return localCount;
  }

  private broadcastLocal(event: string, data: unknown): number {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let successCount = 0;

    for (const [clientId, client] of this.clients) {
      try {
        client.response.write(message);
        client.lastActivity = Date.now();
        successCount++;
      } catch (error) {
        sseLogger.error(`Failed to broadcast to client ${clientId}`, error);
        this.removeClient(clientId);
      }
    }

    return successCount;
  }

  async queueEvent(
    clientId: string,
    event: string,
    data: unknown,
    ttl?: number,
  ): Promise<void> {
    try {
      const redis = await getRedis();
      const eventData: SSEEvent = {
        event,
        data,
        timestamp: Date.now(),
        clientId,
      };

      const queueKey = `sse:queue:${clientId}`;
      const currentLength = await redis.llen(queueKey);

      // Enforce max queue size
      if (currentLength >= (this.options.maxQueueSize || 100)) {
        await redis.rpop(queueKey); // Remove oldest
      }

      await redis.lpush(queueKey, JSON.stringify(eventData));
      await redis.expire(queueKey, ttl || this.options.defaultTTL || 3600);
    } catch (error) {
      sseLogger.error("Failed to queue event", error);
    }
  }

  async getQueuedEvents(clientId: string): Promise<SSEEvent[]> {
    try {
      const redis = await getRedis();
      const queueKey = `sse:queue:${clientId}`;
      const messages = await redis.lrange(queueKey, 0, -1);

      // Clear the queue after retrieving
      await redis.del(queueKey);

      return messages
        .map((msg) => {
          try {
            return JSON.parse(msg) as SSEEvent;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse(); // Restore chronological order
    } catch (error) {
      sseLogger.error("Failed to retrieve queued events", error);
      return [];
    }
  }

  async clearQueue(clientId: string): Promise<void> {
    try {
      const redis = await getRedis();
      await redis.del(`sse:queue:${clientId}`);
    } catch (error) {
      sseLogger.error("Failed to clear queue", error);
    }
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = now - (this.options.clientTimeout || 60000);
      const clientsToRemove: string[] = [];

      // Check for timed out clients and send heartbeat to active ones
      for (const [clientId, client] of this.clients) {
        if (client.lastActivity < timeoutThreshold) {
          clientsToRemove.push(clientId);
        } else {
          try {
            client.response.write(
              `event: heartbeat\ndata: ${JSON.stringify({
                timestamp: now,
                uptime: now - this.startTime,
              })}\n\n`,
            );
            client.lastActivity = now;
          } catch (error) {
            clientsToRemove.push(clientId);
          }
        }
      }

      // Remove timed out or errored clients
      clientsToRemove.forEach((clientId) => this.removeClient(clientId));

      this.heartbeatsSent++;

      if (this.clients.size > 0) {
        sseLogger.debug(
          `Heartbeat sent to ${this.clients.size} clients, removed ${clientsToRemove.length} stale connections`,
        );
      }
    }, this.options.heartbeatInterval);

    sseLogger.info(
      `Heartbeat started with ${this.options.heartbeatInterval}ms interval`,
    );
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      sseLogger.info("Heartbeat stopped");
    }
  }

  async cleanup(): Promise<void> {
    sseLogger.info("Cleaning up SSE service...");

    this.stopHeartbeat();

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.response.close?.();
      } catch (error) {
        // Ignore close errors
      }
    }
    this.clients.clear();

    // Cleanup Redis subscription
    if (this.redisSubscriber) {
      try {
        await this.redisSubscriber.unsubscribe("sse-events");
        await this.redisSubscriber.disconnect();
      } catch (error) {
        sseLogger.error("Error cleaning up Redis subscriber", error);
      }
    }

    this.isInitialized = false;
    sseLogger.info("SSE service cleanup completed");
  }
}

// Global singleton instance
declare global {
  var __unifiedSSEService: UnifiedSSEService | undefined;
}

export const unifiedSSEService: IUnifiedSSEService =
  globalThis.__unifiedSSEService ||
  (globalThis.__unifiedSSEService = new UnifiedSSEService());

// Utility functions for easy backend integration
export async function notifyClient(
  clientId: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  return unifiedSSEService.sendToClient(clientId, event, data);
}

export async function broadcastEvent(
  event: string,
  data: unknown,
): Promise<number> {
  return unifiedSSEService.broadcast(event, data);
}

export { unifiedSSEService as sseService };
