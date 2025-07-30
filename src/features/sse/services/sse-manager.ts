import type {
  SSEConnection,
  SSEEvent,
  SSEConnectionMetadata,
  HeartbeatConfig,
  SSEConfig,
} from "../types";
import type {
  SSEManager,
  ConnectionStore,
  HeartbeatManager,
} from "./interfaces";
import { RedisConnectionStore } from "../stores/connection-store";
import { SSEHeartbeatManager } from "./heartbeat-manager";
import {
  SSEMessageFormatter,
  SSEFormatterError,
} from "../utils/message-formatter";
import { logger } from "@/utils/logging";
import { getSSEConfig, isFeatureEnabled } from "../config";

/**
 * SSE Manager error codes for specific error scenarios
 */
export enum SSEManagerErrorCode {
  CONNECTION_REGISTRATION_FAILED = "CONNECTION_REGISTRATION_FAILED",
  CONNECTION_REMOVAL_FAILED = "CONNECTION_REMOVAL_FAILED",
  EVENT_DISPATCH_FAILED = "EVENT_DISPATCH_FAILED",
  HEARTBEAT_FAILED = "HEARTBEAT_FAILED",
  STORE_OPERATION_FAILED = "STORE_OPERATION_FAILED",
  STREAM_WRITE_FAILED = "STREAM_WRITE_FAILED",
  CLEANUP_FAILED = "CLEANUP_FAILED",
}

/**
 * SSE Manager specific error class
 */
export class SSEManagerError extends Error {
  constructor(
    public code: SSEManagerErrorCode,
    message: string,
    public details?: any,
    public connectionId?: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "SSEManagerError";
  }
}

/**
 * SSE connection manager that handles connection lifecycle and event dispatching
 */
export class SSEConnectionManager implements SSEManager {
  private activeConnections = new Map<string, SSEConnection>();
  private connectionStore: ConnectionStore;
  private heartbeatManager: HeartbeatManager;
  private messageFormatter: SSEMessageFormatter;
  private contextLogger = logger.createContextLogger("SSEConnectionManager");
  private config: SSEConfig;

  // Metrics tracking
  private metrics = {
    totalConnections: 0,
    totalEvents: 0,
    totalErrors: 0,
    connectionErrors: 0,
    eventErrors: 0,
    heartbeatErrors: 0,
    storeErrors: 0,
    streamErrors: 0,
    lastCleanup: new Date(),
    lastMetricsLog: new Date(),
  };

  // Performance monitoring
  private performanceMetrics = {
    eventThroughput: {
      lastMinute: 0,
      lastHour: 0,
      eventTimestamps: [] as number[],
    },
    connectionDurations: [] as number[],
    errorRates: {
      connection: 0,
      event: 0,
      heartbeat: 0,
    },
  };

  constructor(
    connectionStore?: ConnectionStore,
    heartbeatConfig?: Partial<HeartbeatConfig>,
    heartbeatManager?: HeartbeatManager,
  ) {
    // Load configuration from environment
    this.config = getSSEConfig();

    this.connectionStore = connectionStore || new RedisConnectionStore();
    this.heartbeatManager =
      heartbeatManager || new SSEHeartbeatManager(this, heartbeatConfig);
    this.messageFormatter = new SSEMessageFormatter();

    this.contextLogger.info("SSE Connection Manager initialized", {
      config: this.config,
      storeType: this.connectionStore.constructor.name,
    });

    // Start periodic metrics logging if monitoring is enabled
    if (isFeatureEnabled("monitoring")) {
      this.startMetricsLogging();
    }
  }

  /**
   * Add a new SSE connection to the manager
   */
  async addConnection(connection: SSEConnection): Promise<void> {
    const startTime = Date.now();

    try {
      this.contextLogger.info("Adding new SSE connection", {
        connectionId: connection.id,
        userId: connection.userId,
        sessionId: connection.sessionId,
        clientId: connection.clientId,
        timestamp: new Date().toISOString(),
      });

      // Check connection limits
      await this.enforceConnectionLimits(connection);

      // Validate connection object
      this.validateConnection(connection);

      // Store in memory for active connections
      this.activeConnections.set(connection.id, connection);

      // Store metadata in Redis with error handling
      const metadata: SSEConnectionMetadata = {
        id: connection.id,
        userId: connection.userId,
        sessionId: connection.sessionId,
        clientId: connection.clientId,
        connectedAt: connection.connectedAt.toISOString(),
        lastActivity: new Date().toISOString(),
      };

      try {
        await this.connectionStore.storeConnection(metadata);
      } catch (storeError) {
        this.metrics.storeErrors++;
        this.contextLogger.error(
          "Failed to store connection metadata in Redis",
          storeError,
          {
            connectionId: connection.id,
            operation: "storeConnection",
          },
        );

        // For critical Redis failures, we should fail the connection
        throw new SSEManagerError(
          SSEManagerErrorCode.STORE_OPERATION_FAILED,
          `Failed to store connection metadata: ${storeError instanceof Error ? storeError.message : "Unknown error"}`,
          {
            connectionId: connection.id,
            operation: "storeConnection",
          },
          connection.id,
          storeError instanceof Error
            ? storeError
            : new Error(String(storeError)),
        );
      }

      // Start heartbeat for this connection
      try {
        this.heartbeatManager.startHeartbeat(connection.id);
      } catch (heartbeatError) {
        this.metrics.heartbeatErrors++;
        this.contextLogger.error(
          "Failed to start heartbeat for connection",
          heartbeatError,
          {
            connectionId: connection.id,
          },
        );

        // Continue with connection setup even if heartbeat fails
        this.contextLogger.warn(
          "Continuing with connection setup despite heartbeat failure",
          {
            connectionId: connection.id,
          },
        );
      }

      // Update metrics
      this.metrics.totalConnections++;
      this.updatePerformanceMetrics("connection", Date.now() - startTime);

      this.contextLogger.info("SSE connection added successfully", {
        connectionId: connection.id,
        totalActiveConnections: this.activeConnections.size,
        setupDuration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.metrics.connectionErrors++;
      this.metrics.totalErrors++;
      this.performanceMetrics.errorRates.connection++;

      this.contextLogger.error("Failed to add SSE connection", error, {
        connectionId: connection.id,
        userId: connection.userId,
        sessionId: connection.sessionId,
        setupDuration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      // Clean up partial state
      await this.cleanupFailedConnection(connection.id);

      // Throw specific error
      throw new SSEManagerError(
        SSEManagerErrorCode.CONNECTION_REGISTRATION_FAILED,
        `Failed to register SSE connection ${connection.id}`,
        {
          connectionId: connection.id,
          userId: connection.userId,
          sessionId: connection.sessionId,
          setupDuration: Date.now() - startTime,
        },
        connection.id,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Remove a connection from the manager
   */
  async removeConnection(connectionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.contextLogger.info("Removing SSE connection", {
        connectionId,
        timestamp: new Date().toISOString(),
      });

      const connection = this.activeConnections.get(connectionId);
      let connectionDuration = 0;

      if (connection) {
        connectionDuration = Date.now() - connection.connectedAt.getTime();
        this.performanceMetrics.connectionDurations.push(connectionDuration);

        // Keep only last 1000 connection durations for memory management
        if (this.performanceMetrics.connectionDurations.length > 1000) {
          this.performanceMetrics.connectionDurations =
            this.performanceMetrics.connectionDurations.slice(-1000);
        }
      }

      // Stop heartbeat for this connection
      try {
        this.heartbeatManager.stopHeartbeat(connectionId);
      } catch (heartbeatError) {
        this.contextLogger.warn(
          "Error stopping heartbeat during connection removal",
          heartbeatError,
          {
            connectionId,
          },
        );
      }

      // Remove from active connections and close stream
      if (connection) {
        try {
          // Close the connection gracefully
          connection.controller.close();
          this.contextLogger.debug("Connection stream closed successfully", {
            connectionId,
          });
        } catch (streamError) {
          this.metrics.streamErrors++;
          this.contextLogger.warn(
            "Error closing connection stream",
            streamError,
            {
              connectionId,
            },
          );
        }
        this.activeConnections.delete(connectionId);
      }

      // Remove from Redis store
      try {
        await this.connectionStore.removeConnection(connectionId);
      } catch (storeError) {
        this.metrics.storeErrors++;
        this.contextLogger.error(
          "Failed to remove connection from Redis store",
          storeError,
          {
            connectionId,
            operation: "removeConnection",
          },
        );
        // Continue with cleanup even if Redis fails
      }

      this.contextLogger.info("SSE connection removed successfully", {
        connectionId,
        connectionDuration,
        totalActiveConnections: this.activeConnections.size,
        cleanupDuration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.metrics.connectionErrors++;
      this.metrics.totalErrors++;

      this.contextLogger.error("Failed to remove SSE connection", error, {
        connectionId,
        cleanupDuration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      // Still try to clean up what we can
      await this.cleanupFailedConnection(connectionId);

      throw new SSEManagerError(
        SSEManagerErrorCode.CONNECTION_REMOVAL_FAILED,
        `Failed to remove SSE connection ${connectionId}`,
        {
          connectionId,
          cleanupDuration: Date.now() - startTime,
        },
        connectionId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Send event to all connections for a specific user
   */
  async sendToUser(userId: string, event: SSEEvent): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.contextLogger.debug("Sending event to user", {
        userId,
        eventType: event.event,
        eventId: event.id,
        timestamp: new Date().toISOString(),
      });

      const userConnections =
        await this.connectionStore.getUserConnections(userId);
      let sentCount = 0;
      let failedCount = 0;

      if (userConnections.length === 0) {
        this.contextLogger.debug("No connections found for user", {
          userId,
          eventType: event.event,
        });
        return false;
      }

      for (const connectionMeta of userConnections) {
        const connection = this.activeConnections.get(connectionMeta.id);
        if (connection) {
          try {
            const success = await this.sendEventToConnection(connection, event);
            if (success) {
              sentCount++;
              // Update last activity
              try {
                await this.connectionStore.updateLastActivity(connection.id);
              } catch (updateError) {
                this.contextLogger.warn(
                  "Failed to update last activity",
                  updateError,
                  {
                    connectionId: connection.id,
                  },
                );
              }
            } else {
              failedCount++;
            }
          } catch (sendError) {
            failedCount++;
            this.contextLogger.warn(
              "Failed to send event to user connection",
              sendError,
              {
                userId,
                connectionId: connectionMeta.id,
                eventType: event.event,
              },
            );
          }
        } else {
          // Connection not in memory, might be stale
          this.contextLogger.debug(
            "Connection not found in memory, cleaning up",
            {
              connectionId: connectionMeta.id,
              userId,
            },
          );

          try {
            await this.connectionStore.removeConnection(connectionMeta.id);
          } catch (cleanupError) {
            this.contextLogger.warn(
              "Failed to cleanup stale connection reference",
              cleanupError,
              {
                connectionId: connectionMeta.id,
              },
            );
          }
        }
      }

      this.metrics.totalEvents += sentCount;
      this.updateEventThroughput();

      this.contextLogger.info("Event sent to user connections", {
        userId,
        eventType: event.event,
        totalConnections: userConnections.length,
        sentCount,
        failedCount,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      return sentCount > 0;
    } catch (error) {
      this.metrics.eventErrors++;
      this.metrics.totalErrors++;
      this.performanceMetrics.errorRates.event++;

      this.contextLogger.error("Failed to send event to user", error, {
        userId,
        eventType: event.event,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      throw new SSEManagerError(
        SSEManagerErrorCode.EVENT_DISPATCH_FAILED,
        `Failed to send event to user ${userId}`,
        {
          userId,
          eventType: event.event,
          duration: Date.now() - startTime,
        },
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Send event to all connections for a specific session
   */
  async sendToSession(sessionId: string, event: SSEEvent): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.contextLogger.debug("Sending event to session", {
        sessionId,
        eventType: event.event,
        eventId: event.id,
        timestamp: new Date().toISOString(),
      });

      const sessionConnections =
        await this.connectionStore.getSessionConnections(sessionId);
      let sentCount = 0;
      let failedCount = 0;

      if (sessionConnections.length === 0) {
        this.contextLogger.debug("No connections found for session", {
          sessionId,
          eventType: event.event,
        });
        return false;
      }

      for (const connectionMeta of sessionConnections) {
        const connection = this.activeConnections.get(connectionMeta.id);
        if (connection) {
          try {
            const success = await this.sendEventToConnection(connection, event);
            if (success) {
              sentCount++;
              // Update last activity
              try {
                await this.connectionStore.updateLastActivity(connection.id);
              } catch (updateError) {
                this.contextLogger.warn(
                  "Failed to update last activity",
                  updateError,
                  {
                    connectionId: connection.id,
                  },
                );
              }
            } else {
              failedCount++;
            }
          } catch (sendError) {
            failedCount++;
            this.contextLogger.warn(
              "Failed to send event to session connection",
              sendError,
              {
                sessionId,
                connectionId: connectionMeta.id,
                eventType: event.event,
              },
            );
          }
        } else {
          // Connection not in memory, might be stale
          this.contextLogger.debug(
            "Connection not found in memory, cleaning up",
            {
              connectionId: connectionMeta.id,
              sessionId,
            },
          );

          try {
            await this.connectionStore.removeConnection(connectionMeta.id);
          } catch (cleanupError) {
            this.contextLogger.warn(
              "Failed to cleanup stale connection reference",
              cleanupError,
              {
                connectionId: connectionMeta.id,
              },
            );
          }
        }
      }

      this.metrics.totalEvents += sentCount;
      this.updateEventThroughput();

      this.contextLogger.info("Event sent to session connections", {
        sessionId,
        eventType: event.event,
        totalConnections: sessionConnections.length,
        sentCount,
        failedCount,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      return sentCount > 0;
    } catch (error) {
      this.metrics.eventErrors++;
      this.metrics.totalErrors++;
      this.performanceMetrics.errorRates.event++;

      this.contextLogger.error("Failed to send event to session", error, {
        sessionId,
        eventType: event.event,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      throw new SSEManagerError(
        SSEManagerErrorCode.EVENT_DISPATCH_FAILED,
        `Failed to send event to session ${sessionId}`,
        {
          sessionId,
          eventType: event.event,
          duration: Date.now() - startTime,
        },
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Send event to a specific client connection
   */
  async sendToClient(clientId: string, event: SSEEvent): Promise<boolean> {
    // Find connection by clientId
    for (const [connectionId, connection] of this.activeConnections) {
      if (connection.clientId === clientId) {
        const success = await this.sendEventToConnection(connection, event);
        if (success) {
          // Update last activity
          await this.connectionStore.updateLastActivity(connectionId);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Broadcast event to all active connections
   */
  async broadcast(event: SSEEvent): Promise<number> {
    let sentCount = 0;

    for (const [connectionId, connection] of this.activeConnections) {
      const success = await this.sendEventToConnection(connection, event);
      if (success) {
        sentCount++;
        // Update last activity
        await this.connectionStore.updateLastActivity(connectionId);
      }
    }

    return sentCount;
  }

  /**
   * Get all active connections
   */
  async getActiveConnections(): Promise<SSEConnection[]> {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Clean up stale connections and perform maintenance
   */
  async cleanup(): Promise<void> {
    // Use heartbeat manager to clean up stale connections
    const staleConnectionIds =
      await this.heartbeatManager.cleanupStaleConnections();

    // Clean up stale connections from Redis (older than 1 hour)
    const oneHourMs = 60 * 60 * 1000;
    const redisStaleConnections =
      await this.connectionStore.cleanupStaleConnections(oneHourMs);

    console.log(
      `Cleaned up ${staleConnectionIds.length} stale heartbeat connections and ${redisStaleConnections.length} stale Redis connections`,
    );
  }

  /**
   * Send an event to a specific connection
   */
  private async sendEventToConnection(
    connection: SSEConnection,
    event: SSEEvent,
  ): Promise<boolean> {
    try {
      // Check rate limiting if enabled
      if (isFeatureEnabled("rateLimiting")) {
        const canSend = this.checkRateLimit();
        if (!canSend) {
          this.contextLogger.warn("Rate limit exceeded, dropping event", {
            connectionId: connection.id,
            eventType: event.event,
            maxEventsPerSecond: this.config.limits.maxEventsPerSecond,
          });
          return false;
        }
      }

      // Format the event
      const formattedEvent = this.messageFormatter.formatEvent(event);

      // Check payload size limit
      const payloadSize = new TextEncoder().encode(formattedEvent).length;
      if (payloadSize > this.config.limits.maxPayloadSize) {
        this.contextLogger.warn(
          "Event payload exceeds size limit, dropping event",
          {
            connectionId: connection.id,
            eventType: event.event,
            payloadSize,
            maxPayloadSize: this.config.limits.maxPayloadSize,
          },
        );
        return false;
      }

      // Enqueue the event data
      connection.controller.enqueue(new TextEncoder().encode(formattedEvent));

      // Update last ping time
      connection.lastPing = new Date();

      this.contextLogger.debug("Event sent to connection successfully", {
        connectionId: connection.id,
        eventType: event.event,
        eventId: event.id,
      });

      return true;
    } catch (error) {
      this.metrics.streamErrors++;
      this.metrics.eventErrors++;
      this.metrics.totalErrors++;

      this.contextLogger.error("Failed to send event to connection", error, {
        connectionId: connection.id,
        eventType: event.event,
        eventId: event.id,
        userId: connection.userId,
        sessionId: connection.sessionId,
      });

      // Log specific formatting errors
      if (error instanceof SSEFormatterError) {
        this.contextLogger.error("SSE formatting error", error, {
          connectionId: connection.id,
          code: error.code,
          details: error.details,
        });
      }

      // If the connection is broken, remove it
      try {
        await this.removeConnection(connection.id);
        this.contextLogger.info("Removed broken connection", {
          connectionId: connection.id,
          reason: "send_event_failed",
        });
      } catch (removeError) {
        this.contextLogger.error(
          "Failed to remove broken connection",
          removeError,
          {
            connectionId: connection.id,
          },
        );
      }

      return false;
    }
  }

  /**
   * Send a heartbeat event to a specific connection
   */
  async sendHeartbeat(connectionId: string): Promise<boolean> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) {
      this.contextLogger.debug("Connection not found for heartbeat", {
        connectionId,
      });
      return false;
    }

    try {
      const heartbeatMessage =
        this.messageFormatter.formatHeartbeat(connectionId);
      connection.controller.enqueue(new TextEncoder().encode(heartbeatMessage));
      connection.lastPing = new Date();

      // Update last activity in store
      try {
        await this.connectionStore.updateLastActivity(connectionId);
      } catch (updateError) {
        this.contextLogger.warn(
          "Failed to update last activity for heartbeat",
          updateError,
          {
            connectionId,
          },
        );
        // Don't fail heartbeat for store update issues
      }

      this.contextLogger.debug("Heartbeat sent successfully", {
        connectionId,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      this.metrics.heartbeatErrors++;
      this.metrics.totalErrors++;
      this.performanceMetrics.errorRates.heartbeat++;

      this.contextLogger.error(
        "Failed to send heartbeat to connection",
        error,
        {
          connectionId,
          userId: connection.userId,
          sessionId: connection.sessionId,
        },
      );

      // Remove the connection if heartbeat fails
      try {
        await this.removeConnection(connectionId);
        this.contextLogger.info("Removed connection after heartbeat failure", {
          connectionId,
          reason: "heartbeat_failed",
        });
      } catch (removeError) {
        this.contextLogger.error(
          "Failed to remove connection after heartbeat failure",
          removeError,
          {
            connectionId,
          },
        );
      }

      return false;
    }
  }

  /**
   * Send an error event to a specific connection
   */
  async sendError(connectionId: string, error: Error): Promise<boolean> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      const errorMessage = this.messageFormatter.formatError(
        error,
        connectionId,
      );
      connection.controller.enqueue(new TextEncoder().encode(errorMessage));

      return true;
    } catch (formattingError) {
      console.error(
        `Failed to send error event to connection ${connectionId}:`,
        formattingError,
      );
      return false;
    }
  }

  /**
   * Get the message formatter instance
   */
  getMessageFormatter(): SSEMessageFormatter {
    return this.messageFormatter;
  }

  /**
   * Get connection count for a specific user
   */
  async getUserConnectionCount(userId: string): Promise<number> {
    return await this.connectionStore.getUserConnectionCount(userId);
  }

  /**
   * Get connection count for a specific session
   */
  async getSessionConnectionCount(sessionId: string): Promise<number> {
    return await this.connectionStore.getSessionConnectionCount(sessionId);
  }

  /**
   * Get total active connection count
   */
  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Check if a specific connection is active
   */
  isConnectionActive(connectionId: string): boolean {
    return this.activeConnections.has(connectionId);
  }

  /**
   * Get the heartbeat manager instance
   */
  getHeartbeatManager(): HeartbeatManager {
    return this.heartbeatManager;
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.activeConnections.size,
      performanceMetrics: {
        ...this.performanceMetrics,
        averageConnectionDuration: this.calculateAverageConnectionDuration(),
        eventThroughputPerMinute: this.calculateEventThroughputPerMinute(),
        errorRates: { ...this.performanceMetrics.errorRates },
      },
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      totalEvents: 0,
      totalErrors: 0,
      connectionErrors: 0,
      eventErrors: 0,
      heartbeatErrors: 0,
      storeErrors: 0,
      streamErrors: 0,
      lastCleanup: new Date(),
      lastMetricsLog: new Date(),
    };

    this.performanceMetrics = {
      eventThroughput: {
        lastMinute: 0,
        lastHour: 0,
        eventTimestamps: [],
      },
      connectionDurations: [],
      errorRates: {
        connection: 0,
        event: 0,
        heartbeat: 0,
      },
    };

    this.contextLogger.info("Metrics reset", {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if rate limit allows sending another event
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Clean up old timestamps
    this.performanceMetrics.eventThroughput.eventTimestamps =
      this.performanceMetrics.eventThroughput.eventTimestamps.filter(
        (timestamp) => timestamp > oneSecondAgo,
      );

    // Check if we're under the rate limit
    const eventsInLastSecond =
      this.performanceMetrics.eventThroughput.eventTimestamps.length;
    if (eventsInLastSecond >= this.config.limits.maxEventsPerSecond) {
      return false;
    }

    // Add current timestamp
    this.performanceMetrics.eventThroughput.eventTimestamps.push(now);
    return true;
  }

  /**
   * Enforce connection limits based on configuration
   */
  private async enforceConnectionLimits(
    connection: SSEConnection,
  ): Promise<void> {
    // Check total connection limit
    const currentConnections = this.activeConnections.size;
    if (currentConnections >= this.config.limits.maxConnections) {
      throw new SSEManagerError(
        SSEManagerErrorCode.CONNECTION_REGISTRATION_FAILED,
        `Maximum connection limit reached: ${this.config.limits.maxConnections}`,
        {
          currentConnections,
          maxConnections: this.config.limits.maxConnections,
          connectionId: connection.id,
        },
      );
    }

    // Check per-user connection limit if authentication is enabled and user is provided
    if (isFeatureEnabled("authentication") && connection.userId) {
      const userConnections = Array.from(
        this.activeConnections.values(),
      ).filter((conn) => conn.userId === connection.userId).length;

      if (userConnections >= this.config.security.maxConnectionsPerUser) {
        throw new SSEManagerError(
          SSEManagerErrorCode.CONNECTION_REGISTRATION_FAILED,
          `Maximum connections per user reached: ${this.config.security.maxConnectionsPerUser}`,
          {
            userId: connection.userId,
            userConnections,
            maxConnectionsPerUser: this.config.security.maxConnectionsPerUser,
            connectionId: connection.id,
          },
        );
      }
    }

    // Note: IP-based limits would require additional context (request IP)
    // This could be added as a parameter to addConnection if needed
  }

  /**
   * Validate connection object
   */
  private validateConnection(connection: SSEConnection): void {
    if (!connection.id || typeof connection.id !== "string") {
      throw new SSEManagerError(
        SSEManagerErrorCode.CONNECTION_REGISTRATION_FAILED,
        "Connection ID is required and must be a string",
        { connection },
      );
    }

    if (!connection.controller) {
      throw new SSEManagerError(
        SSEManagerErrorCode.CONNECTION_REGISTRATION_FAILED,
        "Connection controller is required",
        { connectionId: connection.id },
      );
    }

    if (!connection.connectedAt || !(connection.connectedAt instanceof Date)) {
      throw new SSEManagerError(
        SSEManagerErrorCode.CONNECTION_REGISTRATION_FAILED,
        "Connection connectedAt timestamp is required",
        { connectionId: connection.id },
      );
    }
  }

  /**
   * Clean up failed connection state
   */
  private async cleanupFailedConnection(connectionId: string): Promise<void> {
    try {
      // Remove from active connections
      this.activeConnections.delete(connectionId);

      // Stop heartbeat
      this.heartbeatManager.stopHeartbeat(connectionId);

      // Try to remove from store
      try {
        await this.connectionStore.removeConnection(connectionId);
      } catch (storeError) {
        this.contextLogger.warn(
          "Failed to remove failed connection from store",
          storeError,
          {
            connectionId,
          },
        );
      }
    } catch (error) {
      this.contextLogger.error(
        "Error during failed connection cleanup",
        error,
        {
          connectionId,
        },
      );
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(type: string, duration: number): void {
    // This could be expanded to track different types of operations
    // For now, just log significant durations
    if (duration > 1000) {
      // Log operations taking more than 1 second
      this.contextLogger.warn("Slow operation detected", {
        type,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update event throughput metrics
   */
  private updateEventThroughput(): void {
    const now = Date.now();
    this.performanceMetrics.eventThroughput.eventTimestamps.push(now);

    // Clean up old timestamps (keep only last hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    this.performanceMetrics.eventThroughput.eventTimestamps =
      this.performanceMetrics.eventThroughput.eventTimestamps.filter(
        (timestamp) => timestamp > oneHourAgo,
      );
  }

  /**
   * Calculate average connection duration
   */
  private calculateAverageConnectionDuration(): number {
    if (this.performanceMetrics.connectionDurations.length === 0) {
      return 0;
    }

    const sum = this.performanceMetrics.connectionDurations.reduce(
      (acc, duration) => acc + duration,
      0,
    );
    return sum / this.performanceMetrics.connectionDurations.length;
  }

  /**
   * Calculate event throughput per minute
   */
  private calculateEventThroughputPerMinute(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const eventsInLastMinute =
      this.performanceMetrics.eventThroughput.eventTimestamps.filter(
        (timestamp) => timestamp > oneMinuteAgo,
      ).length;

    return eventsInLastMinute;
  }

  /**
   * Start periodic metrics logging
   */
  private startMetricsLogging(): void {
    // Log metrics every 5 minutes
    setInterval(
      () => {
        const metrics = this.getMetrics();
        this.contextLogger.info("SSE Manager Metrics", {
          activeConnections: metrics.activeConnections,
          totalConnections: metrics.totalConnections,
          totalEvents: metrics.totalEvents,
          totalErrors: metrics.totalErrors,
          errorBreakdown: {
            connection: metrics.connectionErrors,
            event: metrics.eventErrors,
            heartbeat: metrics.heartbeatErrors,
            store: metrics.storeErrors,
            stream: metrics.streamErrors,
          },
          performance: {
            averageConnectionDuration:
              metrics.performanceMetrics.averageConnectionDuration,
            eventThroughputPerMinute:
              metrics.performanceMetrics.eventThroughputPerMinute,
            errorRates: metrics.performanceMetrics.errorRates,
          },
          timestamp: new Date().toISOString(),
        });

        this.metrics.lastMetricsLog = new Date();
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }
}
