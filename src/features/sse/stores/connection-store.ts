import { getRedis } from "@/lib/redis";
import type { RedisClient } from "@/lib/redis/types";
import type { SSEConnectionMetadata } from "../types";
import type { ConnectionStore } from "../services/interfaces";
import { logger } from "@/utils/logging";
import { getSSEConfig } from "../config";

/**
 * Connection store error codes
 */
export enum ConnectionStoreErrorCode {
  REDIS_CONNECTION_FAILED = "REDIS_CONNECTION_FAILED",
  STORE_OPERATION_FAILED = "STORE_OPERATION_FAILED",
  RETRIEVE_OPERATION_FAILED = "RETRIEVE_OPERATION_FAILED",
  DELETE_OPERATION_FAILED = "DELETE_OPERATION_FAILED",
  SERIALIZATION_FAILED = "SERIALIZATION_FAILED",
  DESERIALIZATION_FAILED = "DESERIALIZATION_FAILED",
}

/**
 * Connection store specific error class
 */
export class ConnectionStoreError extends Error {
  constructor(
    public code: ConnectionStoreErrorCode,
    message: string,
    public details?: any,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "ConnectionStoreError";
  }
}

/**
 * Redis-backed connection store for SSE connections
 * Manages connection metadata and provides lookup functionality
 */
export class RedisConnectionStore implements ConnectionStore {
  private redis: RedisClient | null = null;
  private readonly keyPrefix: string;
  private readonly connectionTtl: number;
  private contextLogger = logger.createContextLogger("RedisConnectionStore");

  constructor() {
    const config = getSSEConfig();
    // Remove trailing colon if present to avoid double colons
    this.keyPrefix = config.redis.keyPrefix.replace(/:+$/, "");
    this.connectionTtl = config.redis.connectionTtl;
  }

  // Store metrics
  private metrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    redisErrors: 0,
    serializationErrors: 0,
    lastError: null as Error | null,
    lastErrorTime: null as Date | null,
  };

  /**
   * Get Redis client instance with error handling
   */
  private async getRedisClient(): Promise<RedisClient> {
    try {
      if (!this.redis) {
        this.contextLogger.debug("Initializing Redis client");
        this.redis = await getRedis();
        this.contextLogger.info("Redis client initialized successfully");
      }
      return this.redis;
    } catch (error) {
      this.metrics.redisErrors++;
      this.metrics.failedOperations++;
      this.metrics.lastError =
        error instanceof Error ? error : new Error(String(error));
      this.metrics.lastErrorTime = new Date();

      this.contextLogger.error("Failed to get Redis client", error);

      throw new ConnectionStoreError(
        ConnectionStoreErrorCode.REDIS_CONNECTION_FAILED,
        "Failed to establish Redis connection",
        { error },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Generate Redis key for connection metadata
   */
  private getConnectionKey(connectionId: string): string {
    return `${this.keyPrefix}:connections:${connectionId}`;
  }

  /**
   * Generate Redis key for user connections set
   */
  private getUserConnectionsKey(userId: string): string {
    return `${this.keyPrefix}:user:${userId}:connections`;
  }

  /**
   * Generate Redis key for session connections set
   */
  private getSessionConnectionsKey(sessionId: string): string {
    return `${this.keyPrefix}:session:${sessionId}:connections`;
  }

  /**
   * Store connection metadata in Redis
   */
  async storeConnection(connection: SSEConnectionMetadata): Promise<void> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      this.contextLogger.debug("Storing connection metadata", {
        connectionId: connection.id,
        userId: connection.userId,
        sessionId: connection.sessionId,
      });

      const redis = await this.getRedisClient();
      const connectionKey = this.getConnectionKey(connection.id);

      // Validate and serialize connection data
      let serializedConnection: string;
      try {
        serializedConnection = JSON.stringify(connection);
      } catch (serializationError) {
        this.metrics.serializationErrors++;
        this.metrics.failedOperations++;

        throw new ConnectionStoreError(
          ConnectionStoreErrorCode.SERIALIZATION_FAILED,
          "Failed to serialize connection metadata",
          { connection },
          serializationError instanceof Error
            ? serializationError
            : new Error(String(serializationError)),
        );
      }

      // Store connection metadata as JSON with TTL
      await redis.set(connectionKey, serializedConnection, {
        ex: this.connectionTtl,
      });

      // Add connection ID to user connections set if userId exists
      if (connection.userId) {
        const userKey = this.getUserConnectionsKey(connection.userId);
        await redis.sadd(userKey, connection.id);
        await redis.expire(userKey, this.connectionTtl);
      }

      // Add connection ID to session connections set if sessionId exists
      if (connection.sessionId) {
        const sessionKey = this.getSessionConnectionsKey(connection.sessionId);
        await redis.sadd(sessionKey, connection.id);
        await redis.expire(sessionKey, this.connectionTtl);
      }

      this.metrics.successfulOperations++;

      this.contextLogger.debug("Connection metadata stored successfully", {
        connectionId: connection.id,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.metrics.failedOperations++;
      this.metrics.lastError =
        error instanceof Error ? error : new Error(String(error));
      this.metrics.lastErrorTime = new Date();

      this.contextLogger.error("Failed to store connection metadata", error, {
        connectionId: connection.id,
        duration: Date.now() - startTime,
      });

      if (error instanceof ConnectionStoreError) {
        throw error;
      }

      throw new ConnectionStoreError(
        ConnectionStoreErrorCode.STORE_OPERATION_FAILED,
        `Failed to store connection ${connection.id}`,
        { connectionId: connection.id, duration: Date.now() - startTime },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Retrieve connection metadata by connection ID
   */
  async getConnection(
    connectionId: string,
  ): Promise<SSEConnectionMetadata | null> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      this.contextLogger.debug("Retrieving connection metadata", {
        connectionId,
      });

      const redis = await this.getRedisClient();
      const connectionKey = this.getConnectionKey(connectionId);

      const data = await redis.get(connectionKey);
      if (!data) {
        this.contextLogger.debug("Connection not found", {
          connectionId,
        });
        this.metrics.successfulOperations++;
        return null;
      }

      try {
        const connection = JSON.parse(data) as SSEConnectionMetadata;
        this.metrics.successfulOperations++;

        this.contextLogger.debug("Connection metadata retrieved successfully", {
          connectionId,
          duration: Date.now() - startTime,
        });

        return connection;
      } catch (parseError) {
        this.metrics.serializationErrors++;
        this.metrics.failedOperations++;

        this.contextLogger.error(
          "Failed to parse connection data",
          parseError,
          {
            connectionId,
            rawData: data.substring(0, 100), // Log first 100 chars for debugging
          },
        );

        // Clean up corrupted data
        try {
          await redis.del(connectionKey);
          this.contextLogger.info("Cleaned up corrupted connection data", {
            connectionId,
          });
        } catch (cleanupError) {
          this.contextLogger.warn(
            "Failed to cleanup corrupted data",
            cleanupError,
            {
              connectionId,
            },
          );
        }

        throw new ConnectionStoreError(
          ConnectionStoreErrorCode.DESERIALIZATION_FAILED,
          `Failed to parse connection data for ${connectionId}`,
          { connectionId, rawData: data.substring(0, 100) },
          parseError instanceof Error
            ? parseError
            : new Error(String(parseError)),
        );
      }
    } catch (error) {
      if (!(error instanceof ConnectionStoreError)) {
        this.metrics.failedOperations++;
        this.metrics.lastError =
          error instanceof Error ? error : new Error(String(error));
        this.metrics.lastErrorTime = new Date();

        this.contextLogger.error(
          "Failed to retrieve connection metadata",
          error,
          {
            connectionId,
            duration: Date.now() - startTime,
          },
        );

        throw new ConnectionStoreError(
          ConnectionStoreErrorCode.RETRIEVE_OPERATION_FAILED,
          `Failed to retrieve connection ${connectionId}`,
          { connectionId, duration: Date.now() - startTime },
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      throw error;
    }
  }

  /**
   * Get all connections for a specific user
   */
  async getUserConnections(userId: string): Promise<SSEConnectionMetadata[]> {
    const redis = await this.getRedisClient();
    const userKey = this.getUserConnectionsKey(userId);

    // Get all connection IDs for the user
    const connectionIds = await redis.smembers(userKey);

    // Fetch connection metadata for each ID
    const connections: SSEConnectionMetadata[] = [];
    for (const connectionId of connectionIds) {
      const connection = await this.getConnection(connectionId);
      if (connection) {
        connections.push(connection);
      } else {
        // Clean up stale connection ID from set
        await redis.srem(userKey, connectionId);
      }
    }

    return connections;
  }

  /**
   * Get all connections for a specific session
   */
  async getSessionConnections(
    sessionId: string,
  ): Promise<SSEConnectionMetadata[]> {
    const redis = await this.getRedisClient();
    const sessionKey = this.getSessionConnectionsKey(sessionId);

    // Get all connection IDs for the session
    const connectionIds = await redis.smembers(sessionKey);

    // Fetch connection metadata for each ID
    const connections: SSEConnectionMetadata[] = [];
    for (const connectionId of connectionIds) {
      const connection = await this.getConnection(connectionId);
      if (connection) {
        connections.push(connection);
      } else {
        // Clean up stale connection ID from set
        await redis.srem(sessionKey, connectionId);
      }
    }

    return connections;
  }

  /**
   * Remove connection and clean up all references
   */
  async removeConnection(connectionId: string): Promise<void> {
    const redis = await this.getRedisClient();

    // Get connection metadata before deletion to clean up references
    const connection = await this.getConnection(connectionId);

    // Remove connection metadata
    const connectionKey = this.getConnectionKey(connectionId);
    await redis.del(connectionKey);

    if (connection) {
      // Remove from user connections set
      if (connection.userId) {
        const userKey = this.getUserConnectionsKey(connection.userId);
        await redis.srem(userKey, connectionId);
      }

      // Remove from session connections set
      if (connection.sessionId) {
        const sessionKey = this.getSessionConnectionsKey(connection.sessionId);
        await redis.srem(sessionKey, connectionId);
      }
    }
  }

  /**
   * Get all active connections (for debugging/monitoring)
   */
  async getAllConnections(): Promise<SSEConnectionMetadata[]> {
    const redis = await this.getRedisClient();

    // Use scan to find all connection keys
    const connections: SSEConnectionMetadata[] = [];
    let cursor = "0";

    do {
      const result = await redis.scan(cursor, {
        match: `${this.keyPrefix}:connections:*`,
        count: 100,
      });

      cursor = result.cursor;

      // Fetch connection data for each key
      for (const key of result.keys) {
        const data = await redis.get(key);
        if (data) {
          try {
            const connection = JSON.parse(data) as SSEConnectionMetadata;
            connections.push(connection);
          } catch (error) {
            console.error(
              `Failed to parse connection data for key ${key}:`,
              error,
            );
          }
        }
      }
    } while (cursor !== "0");

    return connections;
  }

  /**
   * Update last activity timestamp for a connection
   */
  async updateLastActivity(connectionId: string): Promise<void> {
    const redis = await this.getRedisClient();
    const connection = await this.getConnection(connectionId);

    if (connection) {
      connection.lastActivity = new Date().toISOString();
      const connectionKey = this.getConnectionKey(connectionId);
      await redis.set(connectionKey, JSON.stringify(connection));
    }
  }

  /**
   * Get connection count for a user
   */
  async getUserConnectionCount(userId: string): Promise<number> {
    const redis = await this.getRedisClient();
    const userKey = this.getUserConnectionsKey(userId);
    return await redis.scard(userKey);
  }

  /**
   * Get connection count for a session
   */
  async getSessionConnectionCount(sessionId: string): Promise<number> {
    const redis = await this.getRedisClient();
    const sessionKey = this.getSessionConnectionsKey(sessionId);
    return await redis.scard(sessionKey);
  }

  /**
   * Clean up stale connections based on last activity
   */
  async cleanupStaleConnections(maxAgeMs: number): Promise<string[]> {
    const redis = await this.getRedisClient();
    const allConnections = await this.getAllConnections();
    const staleConnections: string[] = [];
    const cutoffTime = new Date(Date.now() - maxAgeMs);

    for (const connection of allConnections) {
      const lastActivity = new Date(connection.lastActivity);
      if (lastActivity < cutoffTime) {
        staleConnections.push(connection.id);
        await this.removeConnection(connection.id);
      }
    }

    return staleConnections;
  }

  /**
   * Get store metrics for monitoring
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalOperations > 0
          ? (this.metrics.successfulOperations / this.metrics.totalOperations) *
            100
          : 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      redisErrors: 0,
      serializationErrors: 0,
      lastError: null,
      lastErrorTime: null,
    };

    this.contextLogger.info("Store metrics reset", {
      timestamp: new Date().toISOString(),
    });
  }
}
