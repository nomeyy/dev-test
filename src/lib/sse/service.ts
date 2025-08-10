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
const CONSTANTS = {
  CONNECTION_PREFIX: "sse:connection:",
  USER_PREFIX: "sse:user:",
  STATS_KEY: "sse:stats",
};

export const sseService = {
  // --------------------
  // Connection Management
  // --------------------
  connectionControllers: new Map<string, ReadableStreamDefaultController>(),
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

  async initializeSubscriber(redisService: RedisClient, connectionId: string) {
    const channel = `${CONSTANTS.CONNECTION_PREFIX}${connectionId}`;

    if (!connectionId) {
      console.error("connectionId is null");
      return;
    }

    redisService
      .subscribe(channel)
      .on("message", (data: { message: string }) => {
        const controller = this.getController(connectionId);

        if (controller) {
          const eventData = `data: ${JSON.stringify(data.message)}\n\n`;
          controller.enqueue(new TextEncoder().encode(eventData));
        }
      });
  },

  /**
   * Creates a new Page connection and stores it in Redis.
   */
  async connect(options: SSEConnectionOptions): Promise<SSEConnection> {
    const redisService = await getRedis();
    const connectionId = this.generateConnectionId();
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
      `${CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
      "data",
      JSON.stringify(connection),
    );

    // Add to user connections if userId provided
    if (options.userId) {
      await redisService.sadd(
        `${CONSTANTS.USER_PREFIX}${options.userId}`,
        connectionId,
      );
    }

    // Update stats
    await this.updateStats("connect");

    return connection;
  },

  /**
   * Disconnects a client and cleans up all associated data.
   */
  async disconnect(connectionId: string): Promise<void> {
    const redisService = await getRedis();
    const connection = await this.getConnection(connectionId);

    if (!connection) return;

    // Remove from user connections
    if (connection.userId) {
      await redisService.srem(
        `${CONSTANTS.USER_PREFIX}${connection.userId}`,
        connectionId,
      );
    }

    // Delete connection data
    await redisService.hdel(
      `${CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
      "data",
    );

    // Update stats
    await this.updateStats("disconnect");
  },

  /**
   * Retrieves a connection by ID.
   */
  async getConnection(connectionId: string): Promise<SSEConnection | null> {
    const redisService = await getRedis();
    const data = await redisService.hget(
      `${CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
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
      `${CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
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
          `${CONSTANTS.USER_PREFIX}${userId}`,
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
    const statsData = await redisService.hgetall(CONSTANTS.STATS_KEY);

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
      `${CONSTANTS.CONNECTION_PREFIX}${connectionId}`,
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
      CONSTANTS.STATS_KEY,
      "totalConnections",
      stats.totalConnections,
    );
    await redisService.hset(
      CONSTANTS.STATS_KEY,
      "activeConnections",
      stats.activeConnections,
    );
    await redisService.hset(
      CONSTANTS.STATS_KEY,
      "eventsSent",
      stats.eventsSent,
    );
  },
};
