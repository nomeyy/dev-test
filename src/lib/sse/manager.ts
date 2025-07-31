import { getRedis } from "@/lib/redis";
import { RedisService } from "@/features/redis";
import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEEvent,
  SSEConnection,
  SSEManagerConfig,
  SendEventOptions,
} from "./types";
import { SSEEventType } from "./types";
import {
  SSERedisKeys,
  generateConnectionId,
  createSSEEvent,
  formatSSEMessage,
  isConnectionAlive,
  extractClientInfo,
} from "./utils";

// Create service context for logging and error handling
const { log, handleError } = createServiceContext("SSEManager");

/**
 * SSE Manager - Centralized management of Server-Sent Events
 * Handles connection lifecycle, event dispatching, and Redis coordination
 */
export class SSEManager {
  private redisService: RedisService | null = null; // Allow null for fallback
  private config: SSEManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private inMemoryConnections: Map<string, SSEConnection> = new Map(); // Fallback storage
  private eventListeners: Map<string, (event: SSEEvent) => void> = new Map(); // Direct event delivery

  constructor(config: Partial<SSEManagerConfig> = {}) {
    this.config = {
      heartbeatInterval: 25000, // 25 seconds
      connectionTimeout: 35000, // 35 seconds
      maxConnections: 1000,
      cleanupInterval: 60000, // 1 minute
      ...config,
    };

    this.initializeRedis();
    this.startBackgroundTasks();
  }

  private async initializeRedis() {
    try {
      const redisClient = await getRedis();
      this.redisService = new RedisService(redisClient);
      log.info("SSE Manager initialized with Redis connection");
    } catch (error) {
      // Always use fallback when Redis fails
      log.warn(
        "Redis connection failed, using in-memory fallback for SSE connections",
        { error: error instanceof Error ? error.message : error },
      );
      this.redisService = null; // Explicitly set to null for fallback
    }
  }

  /**
   * Register a new SSE connection
   */
  async registerConnection(
    connectionId: string,
    userId?: string,
    sessionId?: string,
    headers?: Headers,
  ): Promise<void> {
    try {
      const now = Date.now();
      const clientInfo = headers ? extractClientInfo(headers) : {};

      const connection: SSEConnection = {
        connectionId,
        userId,
        sessionId,
        connectedAt: now,
        lastHeartbeat: now,
        ...clientInfo,
      };

      // Store connection info (Redis or fallback)
      if (this.redisService) {
        try {
          await this.redisService.hSet(
            SSERedisKeys.connection(connectionId),
            "data",
            JSON.stringify(connection),
          );

          // Add to global connections set
          await this.redisService.hSet(
            SSERedisKeys.allConnections(),
            connectionId,
            now.toString(),
          );

          // Increment connection counter
          const currentCount = await this.redisService.getValue(
            "sse:connections:count",
          );
          await this.redisService.setValue(
            "sse:connections:count",
            (parseInt(currentCount || "0") + 1).toString(),
          );
        } catch (error) {
          log.warn("Redis operation failed, using in-memory fallback", {
            error,
          });
          this.inMemoryConnections.set(connectionId, connection);
        }
      } else {
        // Use in-memory storage as fallback
        this.inMemoryConnections.set(connectionId, connection);
      }

      // Add to user-specific connections if userId provided (only with Redis)
      if (userId && this.redisService) {
        try {
          await this.redisService.hSet(
            SSERedisKeys.userConnections(userId),
            connectionId,
            now.toString(),
          );
        } catch (error) {
          log.warn("Failed to store user-specific connection", {
            error,
            userId,
          });
        }
      }

      // Add to session-specific connections if sessionId provided (only with Redis)
      if (sessionId && this.redisService) {
        try {
          await this.redisService.hSet(
            SSERedisKeys.sessionConnections(sessionId),
            connectionId,
            now.toString(),
          );
        } catch (error) {
          log.warn("Failed to store session-specific connection", {
            error,
            sessionId,
          });
        }
      }

      log.info("SSE connection registered", {
        connectionId,
        userId,
        sessionId,
        userAgent: (clientInfo as any).userAgent || undefined,
      });

      // Send connection confirmation event
      await this.sendEvent(
        SSEEventType.CONNECTED,
        {
          connectionId,
          message: "Successfully connected to SSE stream",
        },
        { connectionId },
      );
    } catch (error) {
      handleError("Failed to register SSE connection", error);
      throw error;
    }
  }

  /**
   * Unregister an SSE connection
   */
  async unregisterConnection(connectionId: string): Promise<void> {
    try {
      if (this.redisService) {
        try {
          // Get connection info before deletion
          const connectionData = await this.redisService.hGet(
            SSERedisKeys.connection(connectionId),
            "data",
          );

          if (connectionData) {
            let connection: SSEConnection;
            try {
              // Handle both string and object responses from Redis
              connection =
                typeof connectionData === "string"
                  ? JSON.parse(connectionData)
                  : (connectionData as SSEConnection);
            } catch (parseError) {
              log.warn("Failed to parse connection data during cleanup", {
                parseError,
                connectionData,
                connectionId,
              });
              // Continue with cleanup even if we can't parse the connection data
              connection = { connectionId } as SSEConnection;
            }

            // Remove from user connections
            if (connection.userId) {
              await this.redisService.hDel(
                SSERedisKeys.userConnections(connection.userId),
                connectionId,
              );
            }

            // Remove from session connections
            if (connection.sessionId) {
              await this.redisService.hDel(
                SSERedisKeys.sessionConnections(connection.sessionId),
                connectionId,
              );
            }
          }

          // Remove connection data
          await this.redisService.deleteKey(
            SSERedisKeys.connection(connectionId),
          );

          // Remove from global connections
          await this.redisService.hDel(
            SSERedisKeys.allConnections(),
            connectionId,
          );

          // Decrement connection counter
          const currentCount = await this.redisService.getValue(
            "sse:connections:count",
          );
          const newCount = Math.max(0, parseInt(currentCount || "0") - 1);
          await this.redisService.setValue(
            "sse:connections:count",
            newCount.toString(),
          );
        } catch (error) {
          log.warn("Redis cleanup failed, using in-memory fallback", { error });
          this.inMemoryConnections.delete(connectionId);
        }
      } else {
        // Use in-memory storage for cleanup
        this.inMemoryConnections.delete(connectionId);
      }

      // Remove event listener for direct delivery
      this.eventListeners.delete(connectionId);

      log.info("SSE connection unregistered", { connectionId });
    } catch (error) {
      handleError("Failed to unregister SSE connection", error);
    }
  }

  /**
   * Register an event listener for direct event delivery (fallback when Redis fails)
   */
  registerEventListener(
    connectionId: string,
    listener: (event: SSEEvent) => void,
  ): void {
    this.eventListeners.set(connectionId, listener);
    log.info("Registered direct event listener", { connectionId });
  }

  /**
   * Update connection heartbeat
   */
  async updateHeartbeat(connectionId: string): Promise<void> {
    try {
      if (this.redisService) {
        try {
          const connectionData = await this.redisService.hGet(
            SSERedisKeys.connection(connectionId),
            "data",
          );

          if (connectionData) {
            let connection: SSEConnection;
            try {
              // Handle both string and object responses from Redis
              connection =
                typeof connectionData === "string"
                  ? JSON.parse(connectionData)
                  : (connectionData as SSEConnection);
            } catch (parseError) {
              log.warn(
                "Failed to parse connection data, skipping heartbeat update",
                {
                  parseError,
                  connectionData,
                  connectionId,
                },
              );
              return;
            }

            connection.lastHeartbeat = Date.now();

            await this.redisService.hSet(
              SSERedisKeys.connection(connectionId),
              "data",
              JSON.stringify(connection),
            );
          }
        } catch (error) {
          log.warn("Redis heartbeat update failed", { error, connectionId });
          // Update in-memory connection if Redis fails
          const connection = this.inMemoryConnections.get(connectionId);
          if (connection) {
            connection.lastHeartbeat = Date.now();
            this.inMemoryConnections.set(connectionId, connection);
          }
        }
      } else {
        // Update in-memory connection
        const connection = this.inMemoryConnections.get(connectionId);
        if (connection) {
          connection.lastHeartbeat = Date.now();
          this.inMemoryConnections.set(connectionId, connection);
        }
      }
    } catch (error) {
      handleError("Failed to update heartbeat", error);
    }
  }

  /**
   * Send an event to specific targets or broadcast
   */
  async sendEvent(
    type: SSEEventType | string,
    data: any,
    options: SendEventOptions = {},
  ): Promise<void> {
    try {
      const event = createSSEEvent(type, data, {
        userId: options.userId,
        sessionId: options.sessionId,
      });

      const message = JSON.stringify(event);

      if (this.redisService) {
        try {
          if (options.broadcast) {
            // Broadcast to all connections
            await this.redisService.publish(
              SSERedisKeys.pubsub.channel,
              message,
            );
            log.info("Broadcasted SSE event", { type, eventId: event.id });
          } else if (options.connectionId) {
            // Send to specific connection
            await this.redisService.publish(
              SSERedisKeys.pubsub.connectionChannel(options.connectionId),
              message,
            );
            log.info("Sent SSE event to connection", {
              type,
              eventId: event.id,
              connectionId: options.connectionId,
            });
          } else if (options.userId) {
            // Send to all connections for a user
            await this.redisService.publish(
              SSERedisKeys.pubsub.userChannel(options.userId),
              message,
            );
            log.info("Sent SSE event to user", {
              type,
              eventId: event.id,
              userId: options.userId,
            });
          } else if (options.sessionId) {
            // Send to all connections for a session
            await this.redisService.publish(
              SSERedisKeys.pubsub.sessionChannel(options.sessionId),
              message,
            );
            log.info("Sent SSE event to session", {
              type,
              eventId: event.id,
              sessionId: options.sessionId,
            });
          } else {
            // Default to broadcast if no specific target
            await this.redisService.publish(
              SSERedisKeys.pubsub.channel,
              message,
            );
            log.info("Broadcasted SSE event (default)", {
              type,
              eventId: event.id,
            });
          }
        } catch (error) {
          log.warn("Redis pub/sub failed, using direct delivery fallback", {
            error,
            type,
            eventId: event.id,
            options,
          });
          // Fallback to direct delivery
          this.deliverEventDirectly(event, options);
        }
      } else {
        // Use direct delivery when Redis is unavailable
        log.info("Using direct event delivery (Redis unavailable)", {
          type,
          eventId: event.id,
          options,
        });
        this.deliverEventDirectly(event, options);
      }
    } catch (error) {
      handleError("Failed to send SSE event", error);
      throw error;
    }
  }

  /**
   * Deliver event directly to connections (fallback when Redis is unavailable)
   */
  private deliverEventDirectly(
    event: SSEEvent,
    options: SendEventOptions,
  ): void {
    log.info("Starting direct event delivery", {
      eventId: event.id,
      eventType: event.type,
      options,
      totalListeners: this.eventListeners.size,
      totalConnections: this.inMemoryConnections.size,
    });

    if (options.connectionId) {
      // Send to specific connection
      const listener = this.eventListeners.get(options.connectionId);
      if (listener) {
        listener(event);
        log.info("Delivered event directly to connection", {
          eventId: event.id,
          connectionId: options.connectionId,
        });
      } else {
        log.warn("No listener found for connection", {
          connectionId: options.connectionId,
          availableListeners: Array.from(this.eventListeners.keys()),
        });
      }
    } else if (options.broadcast) {
      // Broadcast to all connections
      let deliveredCount = 0;
      log.info("Broadcasting to all listeners", {
        totalListeners: this.eventListeners.size,
      });
      for (const [connectionId, listener] of this.eventListeners.entries()) {
        try {
          listener(event);
          deliveredCount++;
          log.info("Delivered to connection", { connectionId });
        } catch (error) {
          log.error("Error delivering to connection", { connectionId, error });
        }
      }
      log.info("Broadcasted event directly to all connections", {
        eventId: event.id,
        deliveredCount,
      });
    } else if (options.userId) {
      // Send to all connections for a specific user
      let deliveredCount = 0;
      for (const [
        connectionId,
        connection,
      ] of this.inMemoryConnections.entries()) {
        if (connection.userId === options.userId) {
          const listener = this.eventListeners.get(connectionId);
          if (listener) {
            listener(event);
            deliveredCount++;
          }
        }
      }
      log.info("Delivered event directly to user connections", {
        eventId: event.id,
        userId: options.userId,
        deliveredCount,
      });
    } else {
      log.warn("No delivery target specified, defaulting to broadcast", {
        eventId: event.id,
        options,
      });
      // Default to broadcast if no specific target
      let deliveredCount = 0;
      for (const [connectionId, listener] of this.eventListeners.entries()) {
        listener(event);
        deliveredCount++;
      }
      log.info("Default broadcasted event directly", {
        eventId: event.id,
        deliveredCount,
      });
    }
  }

  /**
   * Get active connections count
   */
  async getConnectionsCount(): Promise<number> {
    try {
      if (this.redisService) {
        // Use Redis if available
        const count = await this.redisService.getValue("sse:connections:count");
        return count ? parseInt(count) : 0;
      } else {
        // Fallback to in-memory count
        return this.inMemoryConnections.size;
      }
    } catch (error) {
      handleError("Failed to get connections count", error);
      // Fallback to in-memory count on Redis error
      return this.inMemoryConnections.size;
    }
  }

  /**
   * Get connections for a specific user
   */
  async getUserConnections(userId: string): Promise<string[]> {
    try {
      if (this.redisService) {
        const connections = await this.redisService.hGetAll(
          SSERedisKeys.userConnections(userId),
        );
        return connections ? Object.keys(connections) : [];
      } else {
        // Fallback to in-memory connections
        const userConnections: string[] = [];
        for (const [
          connectionId,
          connection,
        ] of this.inMemoryConnections.entries()) {
          if (connection.userId === userId) {
            userConnections.push(connectionId);
          }
        }
        return userConnections;
      }
    } catch (error) {
      handleError("Failed to get user connections", error);
      return [];
    }
  }

  /**
   * Clean up stale connections
   */
  async cleanupStaleConnections(): Promise<number> {
    try {
      let cleanedCount = 0;
      const now = Date.now();

      if (this.redisService) {
        try {
          const connections = await this.redisService.hGetAll(
            SSERedisKeys.allConnections(),
          );
          if (!connections) return 0;

          for (const [connectionId, lastSeenStr] of Object.entries(
            connections,
          )) {
            const lastSeen = parseInt(String(lastSeenStr));

            if (!isConnectionAlive(lastSeen, this.config.connectionTimeout)) {
              await this.unregisterConnection(connectionId);
              cleanedCount++;
            }
          }
        } catch (error) {
          log.warn("Redis cleanup failed, cleaning in-memory connections", {
            error,
          });
          // Fallback to in-memory cleanup
          for (const [
            connectionId,
            connection,
          ] of this.inMemoryConnections.entries()) {
            if (
              !isConnectionAlive(
                connection.lastHeartbeat,
                this.config.connectionTimeout,
              )
            ) {
              this.inMemoryConnections.delete(connectionId);
              this.eventListeners.delete(connectionId);
              cleanedCount++;
            }
          }
        }
      } else {
        // Clean up in-memory connections
        for (const [
          connectionId,
          connection,
        ] of this.inMemoryConnections.entries()) {
          if (
            !isConnectionAlive(
              connection.lastHeartbeat,
              this.config.connectionTimeout,
            )
          ) {
            this.inMemoryConnections.delete(connectionId);
            this.eventListeners.delete(connectionId);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        log.info("Cleaned up stale SSE connections", { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      handleError("Failed to cleanup stale connections", error);
      return 0;
    }
  }

  /**
   * Send heartbeat to all connections
   */
  async sendHeartbeat(): Promise<void> {
    try {
      await this.sendEvent(
        SSEEventType.HEARTBEAT,
        {
          timestamp: Date.now(),
          message: "heartbeat",
        },
        { broadcast: true },
      );
    } catch (error) {
      handleError("Failed to send heartbeat", error);
    }
  }

  /**
   * Start background tasks (heartbeat and cleanup)
   */
  private startBackgroundTasks(): void {
    // Heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch((error) => {
        log.error("Heartbeat failed", { error });
      });
    }, this.config.heartbeatInterval);

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections().catch((error) => {
        log.error("Cleanup failed", { error });
      });
    }, this.config.cleanupInterval);

    log.info("SSE Manager background tasks started", {
      heartbeatInterval: this.config.heartbeatInterval,
      cleanupInterval: this.config.cleanupInterval,
    });
  }

  /**
   * Stop background tasks and cleanup
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    log.info("SSE Manager destroyed");
  }
}

// Singleton instance
let sseManagerInstance: SSEManager | null = null;

/**
 * Get the singleton SSE Manager instance
 */
export function getSSEManager(): SSEManager {
  if (!sseManagerInstance) {
    sseManagerInstance = new SSEManager();
  }
  return sseManagerInstance;
}

/**
 * Utility function to send SSE events from anywhere in the application
 */
export async function sendSSEEvent(
  type: SSEEventType | string,
  data: any,
  options: SendEventOptions = {},
): Promise<void> {
  const manager = getSSEManager();
  return manager.sendEvent(type, data, options);
}
