import { RedisService } from "@/features/redis";
import { getRedis } from "@/lib/redis";
import { randomUUID } from "crypto";
import type {
  SSEManagerService,
  SSEManagerConfig,
  SSEClientConnection,
  UserSSEStatus,
  SSEEvent,
  SSEConnectionContext,
  BroadcastSSEEvent,
  SSEManagerStats,
} from "../types";

/**
 * Centralized SSE Manager for tracking active client connections per user
 *
 * Features:
 * - Connection tracking per user
 * - Event broadcasting to specific users or all users
 * - Connection activity monitoring
 * - Automatic cleanup of stale connections
 * - Redis-based persistence for scalability
 */
export class SSEManager implements SSEManagerService {
  private redisService!: RedisService;
  private config: Required<SSEManagerConfig>;
  private connections = new Map<string, SSEClientConnection>();
  private cleanupInterval?: NodeJS.Timeout;
  private initializationPromise: Promise<void>;
  private streamControllers = new Map<
    string,
    ReadableStreamDefaultController
  >(); // userId -> controller

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      maxConnectionsPerUser: config.maxConnectionsPerUser ?? 5,
      connectionTimeout: config.connectionTimeout ?? 5 * 60 * 1000, // 5 minutes
      heartbeatInterval: config.heartbeatInterval ?? 30 * 1000, // 30 seconds
      cleanupInterval: config.cleanupInterval ?? 60 * 1000, // 1 minute
      enableLogging: config.enableLogging ?? true,
    };

    this.initializationPromise = this.initializeRedis();
    this.startCleanupInterval();
  }

  private async initializeRedis(): Promise<void> {
    const redisClient = await getRedis();
    this.redisService = new RedisService(redisClient);
  }

  private log(message: string, data?: unknown): void {
    if (this.config.enableLogging) {
      console.log(`[SSE Manager] ${message}`, data ?? "");
    }
  }

  /**
   * Add a new SSE connection for a user
   */
  async addConnection(
    context: SSEConnectionContext,
  ): Promise<SSEClientConnection> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const { userId, userAgent, ipAddress } = context;

    this.log(`Adding new connection for user ${userId}`, {
      userAgent,
      ipAddress,
    });

    // Remove ALL existing connections for this user (latest connection wins)
    // First, check in-memory connections
    const existingInMemoryConnections: SSEClientConnection[] = [];
    for (const connection of this.connections.values()) {
      if (connection.userId === userId && connection.isActive) {
        existingInMemoryConnections.push(connection);
      }
    }

    // Also check Redis for any stale connections
    const redisConnectionsData = await this.redisService.hGetAll(
      `sse:connections:${userId}`,
    );
    const existingRedisConnections: SSEClientConnection[] = [];

    if (redisConnectionsData) {
      for (const [connectionId, connectionData] of Object.entries(
        redisConnectionsData,
      )) {
        try {
          const connection = JSON.parse(
            JSON.stringify(connectionData),
          ) as SSEClientConnection;
          if (connection.isActive) {
            existingRedisConnections.push(connection);
            // Also add to in-memory if not already there
            if (!this.connections.has(connectionId)) {
              this.connections.set(connectionId, connection);
            }
          }
        } catch (error) {
          this.log(
            `Error parsing Redis connection data for ${connectionId}`,
            error,
          );
        }
      }
    }

    // Combine all existing connections
    const allExistingConnections = [
      ...existingInMemoryConnections,
      ...existingRedisConnections,
    ];
    const uniqueExistingConnections = allExistingConnections.filter(
      (connection, index, self) =>
        index === self.findIndex((c) => c.id === connection.id),
    );

    this.log(
      `Found ${uniqueExistingConnections.length} existing connections for user ${userId}`,
      {
        inMemory: existingInMemoryConnections.length,
        inRedis: existingRedisConnections.length,
        unique: uniqueExistingConnections.length,
        existingConnections: uniqueExistingConnections.map((c) => ({
          id: c.id,
          connectedAt: c.connectedAt,
          lastActivity: c.lastActivity,
        })),
      },
    );

    // Remove ALL existing connections for this user
    for (const existingConnection of uniqueExistingConnections) {
      this.log(
        `Removing existing connection ${existingConnection.id} for user ${userId}`,
      );
      await this.removeConnection(existingConnection.id);
    }

    const connection: SSEClientConnection = {
      id: randomUUID(),
      userId,
      userAgent,
      ipAddress,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    // Store in memory for fast access
    this.connections.set(connection.id, connection);

    // Store in Redis for persistence
    await this.redisService.hSet(
      `sse:connections:${userId}`,
      connection.id,
      JSON.stringify(connection),
    );

    // Update user status
    await this.updateUserStatus(userId);

    this.log(`✅ New connection added for user ${userId}`, {
      connectionId: connection.id,
      previousConnectionsRemoved: uniqueExistingConnections.length,
    });
    return connection;
  }

  /**
   * Register a stream controller for a user
   */
  registerStreamController(
    userId: string,
    controller: ReadableStreamDefaultController,
  ): void {
    // If user already has a controller, close the old one
    const existingController = this.streamControllers.get(userId);
    if (existingController) {
      try {
        existingController.close();
      } catch (error) {
        this.log(`Error closing existing controller for user ${userId}`, error);
      }
    }

    this.streamControllers.set(userId, controller);
    this.log(`Stream controller registered for user ${userId}`, {
      totalControllers: this.streamControllers.size,
      userId,
      totalConnections: this.connections.size,
      controllerExists: !!controller,
      allControllers: Array.from(this.streamControllers.keys()),
    });
  }

  /**
   * Unregister a stream controller for a user
   */
  unregisterStreamController(userId: string): void {
    this.streamControllers.delete(userId);
    this.log(`Stream controller unregistered for user ${userId}`);
  }

  /**
   * Force disconnect old connections for a user
   * @deprecated Use addConnection which automatically removes old connections
   */
  async forceDisconnectOldConnections(
    userId: string,
    keepCount = 1,
  ): Promise<void> {
    const userConnections: SSEClientConnection[] = [];
    for (const connection of this.connections.values()) {
      if (connection.userId === userId && connection.isActive) {
        userConnections.push(connection);
      }
    }

    if (userConnections.length > keepCount) {
      // Sort by connection time (oldest first)
      userConnections.sort(
        (a, b) =>
          new Date(a.connectedAt).getTime() - new Date(b.connectedAt).getTime(),
      );

      // Remove oldest connections
      const toRemove = userConnections.slice(
        0,
        userConnections.length - keepCount,
      );

      for (const connection of toRemove) {
        this.log(
          `Force disconnecting old connection ${connection.id} for user ${userId}`,
        );
        await this.removeConnection(connection.id);
      }
    }
  }

  /**
   * Remove a connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Remove stream controller for this user if this is their last connection
    const userConnections = Array.from(this.connections.values()).filter(
      (c) => c.userId === connection.userId && c.id !== connectionId,
    );
    if (userConnections.length === 0) {
      this.unregisterStreamController(connection.userId);
    }

    // Remove from memory
    this.connections.delete(connectionId);

    // Remove from Redis
    await this.redisService.hDel(
      `sse:connections:${connection.userId}`,
      connectionId,
    );

    // Update user status
    await this.updateUserStatus(connection.userId);

    this.log(`Connection removed for user ${connection.userId}`, {
      connectionId,
    });
  }

  /**
   * Get a specific connection
   */
  async getConnection(
    connectionId: string,
  ): Promise<SSEClientConnection | null> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    // Check memory first
    const connection = this.connections.get(connectionId);
    if (connection) {
      return connection;
    }

    // Check Redis if not in memory
    const userIds = await this.redisService.scanKeys("sse:connections:*");
    for (const userIdKey of userIds) {
      const userId = userIdKey.replace("sse:connections:", "");
      const connectionData = await this.redisService.hGet(
        userIdKey,
        connectionId,
      );
      if (connectionData) {
        const parsedConnection = JSON.parse(
          JSON.stringify(connectionData),
        ) as SSEClientConnection;
        this.connections.set(connectionId, parsedConnection);
        return parsedConnection;
      }
    }

    return null;
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<SSEClientConnection[]> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const connectionsData = await this.redisService.hGetAll(
      `sse:connections:${userId}`,
    );
    if (!connectionsData) {
      return [];
    }

    const connections: SSEClientConnection[] = [];
    for (const [connectionId, connectionData] of Object.entries(
      connectionsData,
    )) {
      try {
        const connection = JSON.parse(
          JSON.stringify(connectionData),
        ) as SSEClientConnection;
        if (connection.isActive) {
          connections.push(connection);
          // Update memory cache
          this.connections.set(connectionId, connection);
        }
      } catch (error) {
        this.log(`Error parsing connection data for ${connectionId}`, error);
      }
    }

    return connections;
  }

  /**
   * Update connection activity timestamp
   */
  async updateConnectionActivity(connectionId: string): Promise<void> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return;
    }

    connection.lastActivity = new Date();
    connection.isActive = true;

    // Update in memory
    this.connections.set(connectionId, connection);

    // Update in Redis
    await this.redisService.hSet(
      `sse:connections:${connection.userId}`,
      connectionId,
      JSON.stringify(connection),
    );
  }

  /**
   * Get user's SSE status
   */
  async getUserStatus(userId: string): Promise<UserSSEStatus> {
    const connections = await this.getUserConnections(userId);
    const lastSeen =
      connections.length > 0
        ? new Date(
            Math.max(
              ...connections.map((c) => new Date(c.lastActivity).getTime()),
            ),
          )
        : new Date(0);

    return {
      userId,
      activeConnections: connections.length,
      lastSeen,
      isOnline: connections.length > 0,
    };
  }

  /**
   * Get all user statuses
   */
  async getAllUserStatuses(): Promise<UserSSEStatus[]> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const userIds = await this.redisService.scanKeys("sse:connections:*");
    const statuses: UserSSEStatus[] = [];

    for (const userIdKey of userIds) {
      const userId = userIdKey.replace("sse:connections:", "");
      const status = await this.getUserStatus(userId);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get list of online users
   */
  async getOnlineUsers(): Promise<string[]> {
    const statuses = await this.getAllUserStatuses();
    return statuses
      .filter((status) => status.isOnline)
      .map((status) => status.userId);
  }

  /**
   * Send event to a specific user
   */
  async sendToUser(userId: string, event: SSEEvent): Promise<void> {
    // Use in-memory connections for faster access
    const connections: SSEClientConnection[] = [];

    for (const connection of this.connections.values()) {
      if (connection.userId === userId && connection.isActive) {
        connections.push(connection);
      }
    }

    this.log(`Sending event to user ${userId}`, {
      eventType: event.type,
      connectionCount: connections.length,
      connections: connections.map((c) => c.id),
      availableControllers: Array.from(this.streamControllers.keys()),
    });

    for (const connection of connections) {
      this.log("Sending to user connection", connection);
      await this.sendToConnection(connection.id, event);
    }
  }

  /**
   * Send event to a specific connection
   */
  async sendToConnection(connectionId: string, event: SSEEvent): Promise<void> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const connection = await this.getConnection(connectionId);
    this.log("Sending to connection ####", connection);
    if (!connection) {
      return;
    }

    const eventWithId = {
      ...event,
      id: event.id ?? randomUUID(),
    };

    // Send event through the user's SSE stream controller
    const controller = this.streamControllers.get(connection.userId);
    if (controller) {
      try {
        const encoder = new TextEncoder();
        const eventData = `data: ${JSON.stringify(eventWithId)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
        this.log(
          `✅ Event sent through stream to user ${connection.userId} (connection ${connectionId})`,
          { eventType: event.type },
        );
      } catch (error) {
        this.log(`❌ Error sending event to user ${connection.userId}`, error);
        // Remove the controller if it's no longer valid
        this.unregisterStreamController(connection.userId);
      }
    } else {
      this.log(`❌ No stream controller found for user ${connection.userId}`, {
        eventType: event.type,
        connectionId,
        availableControllers: Array.from(this.streamControllers.keys()),
      });
    }

    // Store event in Redis for the connection (for persistence)
    await this.redisService.hSet(
      `sse:events:${connectionId}`,
      eventWithId.id,
      JSON.stringify(eventWithId),
    );
  }

  /**
   * Broadcast event to all users
   */
  async broadcast(event: BroadcastSSEEvent): Promise<void> {
    // Use in-memory connections for faster access
    const excludeUserIds = event.excludeUserIds ?? [];
    const userIds = new Set<string>();

    this.log(`Starting broadcast for event type: ${event.type}`, {
      totalConnections: this.connections.size,
      excludeUserIds,
    });

    // Get all unique user IDs from in-memory connections
    for (const connection of this.connections.values()) {
      if (!excludeUserIds.includes(connection.userId)) {
        userIds.add(connection.userId);
      }
    }

    this.log(`Found ${userIds.size} users to broadcast to`, {
      userIds: Array.from(userIds),
      connections: Array.from(this.connections.values()).map((c) => ({
        id: c.id,
        userId: c.userId,
        isActive: c.isActive,
      })),
    });

    // Send event to each user
    for (const userId of userIds) {
      this.log("Broadcasting to user", userId);
      await this.sendToUser(userId, event);
    }

    this.log(`✅ Event broadcasted to ${userIds.size} users`, {
      eventType: event.type,
    });
  }

  /**
   * Get SSE manager statistics
   */
  async getStats(): Promise<SSEManagerStats> {
    const statuses = await this.getAllUserStatuses();
    const onlineUsers = statuses.filter((s) => s.isOnline);

    const connectionsByUser: Record<string, number> = {};
    for (const status of statuses) {
      connectionsByUser[status.userId] = status.activeConnections;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: this.connections.size,
      totalUsers: statuses.length,
      onlineUsers: onlineUsers.length,
      connectionsByUser,
    };
  }

  /**
   * Clean up stale connections
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      const timeSinceActivity =
        now.getTime() - new Date(connection.lastActivity).getTime();
      if (timeSinceActivity > this.config.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      await this.removeConnection(connectionId);
    }

    if (staleConnections.length > 0) {
      this.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  /**
   * Check if a connection is active
   */
  async isConnectionActive(connectionId: string): Promise<boolean> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return false;
    }

    const now = new Date();
    const timeSinceActivity =
      now.getTime() - new Date(connection.lastActivity).getTime();
    return timeSinceActivity <= this.config.connectionTimeout;
  }

  /**
   * Validate a connection
   */
  async validateConnection(connectionId: string): Promise<boolean> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return false;
    }

    const isActive = await this.isConnectionActive(connectionId);
    if (!isActive) {
      await this.removeConnection(connectionId);
      return false;
    }

    return true;
  }

  /**
   * Update user status in Redis
   */
  private async updateUserStatus(userId: string): Promise<void> {
    // Ensure Redis is initialized
    await this.initializationPromise;

    const status = await this.getUserStatus(userId);
    await this.redisService.hSet(
      "sse:user_statuses",
      userId,
      JSON.stringify(status),
    );
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((error) => {
        this.log("Error during cleanup", error);
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the SSE manager and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all connections
    this.connections.clear();

    this.log("SSE Manager destroyed");
  }
}
