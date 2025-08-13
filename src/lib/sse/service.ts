import { getRedis } from "@/lib/redis";
import type { RedisClient } from "@/lib/redis/types";
import type {
  SSEConnection,
  SSEEvent,
  SSEConnectionOptions,
  SSEBroadcastOptions,
  SSEStats,
} from "./types";

/**
 * Server-Sent Events service for managing real-time connections and broadcasting.
 *
 * This service provides a scalable Page implementation using Redis for:
 * - Connection management across multiple server instances
 * - Event broadcasting with filtering and targeting
 * - Connection statistics and monitoring
 *
 * @example
 * ```typescript
 *
 * // Connect a client
 * const connection = await sseService.connect({
 *   userId: 'user123',
 * });
 *
 * // Broadcast an event
 * await sseService.broadcast({
 *   type: 'notification',
 *   data: { message: 'Hello world!' }
 * });
 * ```
 */
export const SSE_CONSTANTS = {
  CONNECTION_PREFIX: "sse:connection:",
  USER_PREFIX: "sse:user:",
  STATS_KEY: "sse:stats",
  CONNECTION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
};

export const sseService = {
  // --------------------
  // Connection Management
  // --------------------
  connectionControllers: new Map<string, ReadableStreamDefaultController>(),
  connectionSubscriptions: new Map<string, RedisClient>(),
  connectionTimeouts: new Map<string, NodeJS.Timeout>(),
  connectionHeartbeats: new Map<string, NodeJS.Timeout>(),

  addController(
    connectionId: string,
    controller: ReadableStreamDefaultController,
  ) {
    this.connectionControllers.set(connectionId, controller);
  },

  removeController(connectionId: string) {
    this.connectionControllers.delete(connectionId);
  },

  getController(connectionId: string) {
    return this.connectionControllers.get(connectionId);
  },

  addSubscription(connectionId: string, redisClient: RedisClient) {
    this.connectionSubscriptions.set(connectionId, redisClient);
  },

  removeSubscription(connectionId: string) {
    // Note: Upstash Redis doesn't support unsubscribing from channels
    // The subscription will be cleaned up when the Redis connection is closed
    this.connectionSubscriptions.delete(connectionId);
  },

  addConnectionTimeout(connectionId: string, timeout: NodeJS.Timeout) {
    this.connectionTimeouts.set(connectionId, timeout);
  },

  removeConnectionTimeout(connectionId: string) {
    const timeout = this.connectionTimeouts.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(connectionId);
    }
  },

  addConnectionHeartbeat(connectionId: string, heartbeat: NodeJS.Timeout) {
    this.connectionHeartbeats.set(connectionId, heartbeat);
  },

  removeConnectionHeartbeat(connectionId: string) {
    const heartbeat = this.connectionHeartbeats.get(connectionId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.connectionHeartbeats.delete(connectionId);
    }
  },

  async initializeSubscriber(redisService: RedisClient, connectionId: string) {
    const channel = `${SSE_CONSTANTS.CONNECTION_PREFIX}${connectionId}`;

    if (!connectionId) {
      console.error("connectionId is null");
      return;
    }

    // Store the Redis client for proper cleanup
    this.addSubscription(connectionId, redisService);

    const subscription = redisService.subscribe(channel);
    subscription.on("message", (data: { message: string }) => {
      const controller = this.getController(connectionId);

      if (controller) {
        try {
          const eventData = `data: ${JSON.stringify(data.message)}\n\n`;
          controller.enqueue(new TextEncoder().encode(eventData));
          // Update last activity when message is received
          void this.updateConnection(connectionId, {
            lastActivity: new Date(),
          });
        } catch (error) {
          console.error(
            `Error sending message to connection ${connectionId}:`,
            error,
          );
          // If there's an error sending, disconnect the client
          void this.forceDisconnect(connectionId);
        }
      }
    });
    subscription.on("error", (error: unknown) => {
      console.error(
        `Redis subscription error for connection ${connectionId}:`,
        error,
      );
      void this.forceDisconnect(connectionId);
    });
  },

  /**
   * Creates a new Page connection and stores it in Redis.
   */
  async connect(options: SSEConnectionOptions): Promise<SSEConnection> {
    const redisService = await getRedis();
    const connectionId = this.generateConnectionId();

    try {
      await this.initializeSubscriber(redisService, connectionId);
      const now = new Date();

      const connection: SSEConnection = {
        id: connectionId,
        userId: options.userId,
        connectedAt: now,
        lastActivity: now,
      };

      // Store connection data
      await redisService.hset(
        `${SSE_CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
        "data",
        JSON.stringify(connection),
      );

      // Add to user connections if userId provided
      if (options.userId) {
        await redisService.sadd(
          `${SSE_CONSTANTS.USER_PREFIX}${options.userId}`,
          connectionId,
        );
      }

      // Set connection timeout for cleanup
      const timeout = setTimeout(() => {
        console.warn(`Connection ${connectionId} timed out, cleaning up`);
        void this.forceDisconnect(connectionId);
      }, SSE_CONSTANTS.CONNECTION_TIMEOUT);

      this.addConnectionTimeout(connectionId, timeout);

      // Update stats
      await this.updateStats("connect");

      return connection;
    } catch (error) {
      // Clean up on connection failure
      await this.cleanupConnection(connectionId);
      throw error;
    }
  },

  /**
   * Disconnects a client and cleans up all associated data.
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      await this.cleanupConnection(connectionId);
    } catch (error) {
      console.error(
        `Error during normal disconnect for ${connectionId}:`,
        error,
      );
      // Force cleanup even if normal cleanup fails
      await this.forceDisconnect(connectionId);
    }
  },

  /**
   * Force disconnects a client when normal disconnect fails.
   */
  async forceDisconnect(connectionId: string): Promise<void> {
    try {
      await this.cleanupConnection(connectionId);
    } catch (error) {
      console.error(
        `Error during force disconnect for ${connectionId}:`,
        error,
      );
      // At minimum, clean up local resources
      this.cleanupLocalResources(connectionId);
    }
  },

  cleanupLocalResources(connectionId: string) {
    this.removeController(connectionId);
    this.removeSubscription(connectionId);
    this.removeConnectionTimeout(connectionId);
    this.removeConnectionHeartbeat(connectionId);
  },

  /**
   * Comprehensive cleanup of connection resources.
   */
  async cleanupConnection(connectionId: string): Promise<void> {
    const redisService = await getRedis();
    const connection = await this.getConnection(connectionId);

    // Clean up local resources first
    this.cleanupLocalResources(connectionId);

    if (!connection) return;

    try {
      // Remove from user connections
      if (connection.userId) {
        await redisService.srem(
          `${SSE_CONSTANTS.USER_PREFIX}${connection.userId}`,
          connectionId,
        );
      }

      // Delete connection data
      await redisService.hdel(
        `${SSE_CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
        "data",
      );

      // Update stats
      await this.updateStats("disconnect");
    } catch (error) {
      console.error(
        `Error cleaning up Redis data for connection ${connectionId}:`,
        error,
      );
    }
  },

  /**
   * Cleanup all connections for a specific user.
   */
  async cleanupUserConnections(userId: string): Promise<void> {
    const redisService = await getRedis();
    const userConnections = await redisService.smembers(
      `${SSE_CONSTANTS.USER_PREFIX}${userId}`,
    );

    for (const connectionId of userConnections) {
      await this.forceDisconnect(connectionId);
    }
  },

  /**
   * Get all active connections for a user.
   */
  async getUserConnections(userId: string): Promise<string[]> {
    const redisService = await getRedis();
    return await redisService.smembers(`${SSE_CONSTANTS.USER_PREFIX}${userId}`);
  },

  /**
   * Get all active connections across all users.
   */
  async getAllActiveConnections(): Promise<string[]> {
    const redisService = await getRedis();
    const allConnections: string[] = [];

    // This is a simplified approach - in production you might want to maintain
    // a separate index of active connections for better performance
    let cursor = "0";
    do {
      const result = await redisService.scan(cursor, {});
      cursor = result.cursor;

      for (const key of result.keys) {
        if (key.startsWith(SSE_CONSTANTS.USER_PREFIX)) {
          const userId = key.replace(SSE_CONSTANTS.USER_PREFIX, "");
          const userConnections = await this.getUserConnections(userId);
          allConnections.push(...userConnections);
        }
      }
    } while (cursor !== "0");

    return allConnections;
  },

  /**
   * Periodic cleanup function that should be called regularly.
   * This helps prevent resource leaks by cleaning up stale connections.
   */
  async performPeriodicCleanup(): Promise<void> {
    try {
      console.log("Starting periodic SSE cleanup...");

      // Clean up connections that have no active controller
      const activeConnections = Array.from(this.connectionControllers.keys());
      const redisConnections = await this.getAllActiveConnections();

      // Find orphaned Redis connections (exist in Redis but no local controller)
      for (const connectionId of redisConnections) {
        if (!activeConnections.includes(connectionId)) {
          console.log(`Cleaning up orphaned connection ${connectionId}`);
          await this.forceDisconnect(connectionId);
        }
      }

      // Clean up local resources for connections that no longer exist in Redis
      for (const connectionId of activeConnections) {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
          console.log(
            `Cleaning up local resources for non-existent connection ${connectionId}`,
          );
          this.cleanupLocalResources(connectionId);
        }
      }

      console.log("Periodic SSE cleanup completed");
    } catch (error) {
      console.error("Error during periodic SSE cleanup:", error);
    }
  },

  /**
   * Retrieves a connection by ID.
   */
  async getConnection(connectionId: string): Promise<SSEConnection | null> {
    const redisService = await getRedis();
    const data = await redisService.hget(
      `${SSE_CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
      "data",
    );

    if (!data) {
      return null;
    }

    if (typeof data === "object") {
      return data as SSEConnection;
    }

    return JSON.parse(data) as SSEConnection;
  },

  /**
   * Updates connection data.
   */
  async updateConnection(
    connectionId: string,
    updates: Partial<SSEConnection>,
  ): Promise<void> {
    const redisService = await getRedis();
    const connection = await this.getConnection(connectionId);
    if (!connection) return;

    const updatedConnection = {
      ...connection,
      ...updates,
      lastActivity: new Date(),
    };

    await redisService.hset(
      `${SSE_CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
      "data",
      JSON.stringify(updatedConnection),
    );
  },

  // --------------------
  // Event Broadcasting
  // --------------------

  /**
   * Broadcasts an event to all matching connections.
   */
  async broadcast(
    event: SSEEvent,
    options: SSEBroadcastOptions = {},
  ): Promise<void> {
    const redisService = await getRedis();
    const eventWithTimestamp = {
      ...event,
      timestamp: new Date(),
      id: this.generateEventId(),
    };

    const targetConnections = new Set<string>();

    // Get connections by user IDs
    if (options.userIds) {
      for (const userId of options.userIds) {
        const userConnections = await redisService.smembers(
          `${SSE_CONSTANTS.USER_PREFIX}${userId}`,
        );
        userConnections.forEach((id) => targetConnections.add(id));
      }
    }

    // Remove excluded connections
    if (options.excludeConnectionIds) {
      options.excludeConnectionIds.forEach((id) =>
        targetConnections.delete(id),
      );
    }

    // Send event to all target connections
    for (const connectionId of targetConnections) {
      await this.sendEventToConnection(connectionId, eventWithTimestamp);
    }

    // Update stats
    await this.updateStats("event_sent", targetConnections.size);
  },

  /**
   * Broadcasts an event to all connections of a specific user.
   */
  async broadcastToUser(userId: string, event: SSEEvent): Promise<void> {
    await this.broadcast(event, { userIds: [userId] });
  },

  // --------------------
  // Statistics and Monitoring
  // --------------------

  /**
   * Gets current Page statistics.
   */
  async getStats(): Promise<SSEStats> {
    const redisService = await getRedis();
    const statsData = await redisService.hgetall(SSE_CONSTANTS.STATS_KEY);

    if (!statsData) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        eventsSent: 0,
      };
    }

    return {
      totalConnections: parseInt(statsData.totalConnections ?? "0"),
      activeConnections: parseInt(statsData.activeConnections ?? "0"),
      eventsSent: parseInt(statsData.eventsSent ?? "0"),
    };
  },

  generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  },

  generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  },

  async sendEventToConnection(
    connectionId: string,
    event: SSEEvent,
  ): Promise<void> {
    // This method would be implemented by the actual Page endpoint
    // to send the event to the connected client
    // For now, we just update the connection's last activity

    const redisService = await getRedis();
    await redisService.publish(
      `${SSE_CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
      JSON.stringify(event),
    );

    await this.updateConnection(connectionId, { lastActivity: new Date() });
  },

  async updateStats(
    action: "connect" | "disconnect" | "event_sent",
    count = 1,
  ): Promise<void> {
    const redisService = await getRedis();
    const stats = await this.getStats();

    if (action === "connect") {
      stats.totalConnections += count;
      stats.activeConnections += count;
    } else if (action === "disconnect") {
      stats.activeConnections = Math.max(0, stats.activeConnections - count);
    } else if (action === "event_sent") {
      stats.eventsSent += count;
    }

    await redisService.hset(
      SSE_CONSTANTS.STATS_KEY,
      "totalConnections",
      stats.totalConnections,
    );
    await redisService.hset(
      SSE_CONSTANTS.STATS_KEY,
      "activeConnections",
      stats.activeConnections,
    );
    await redisService.hset(
      SSE_CONSTANTS.STATS_KEY,
      "eventsSent",
      stats.eventsSent,
    );
  },
};
