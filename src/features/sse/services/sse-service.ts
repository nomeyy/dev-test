import { createServiceContext } from "@/utils/service-utils";
import { getRedis } from "@/lib/redis";
import type {
  SSEEvent,
  SSEConnection,
  SSEMessage,
  SSESendOptions,
  SSEConfig,
} from "../types";
import { SSEEventType } from "../types";

const { log, handleError } = createServiceContext("SSEService");

/**
 * Server-Sent Events (SSE) service for real-time client communication
 * Manages client connections, event dispatching, and connection lifecycle
 */
class SSEService {
  private connections: Map<string, SSEConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: SSEConfig;

  constructor(config: Partial<SSEConfig> = {}) {
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      maxConnections: 1000,
      connectionTimeout: 300000, // 5 minutes
      enableLogging: true,
      ...config,
    };

    this.startHeartbeat();
    this.startConnectionCleanup();
  }

  /**
   * Registers a new client connection
   * @param connection - The SSE connection to register
   * @returns The connection ID
   */
  registerConnection(
    connection: Omit<SSEConnection, "id" | "lastActivity" | "isAlive">,
  ): string {
    const connectionId = this.generateConnectionId();

    if (this.connections.size >= this.config.maxConnections) {
      throw new Error("Maximum number of SSE connections reached");
    }

    const fullConnection: SSEConnection = {
      ...connection,
      id: connectionId,
      lastActivity: Date.now(),
      isAlive: true,
    };

    this.connections.set(connectionId, fullConnection);

    if (this.config.enableLogging) {
      log.info("Client connected", {
        connectionId,
        userId: connection.userId,
        sessionId: connection.sessionId,
        totalConnections: this.connections.size,
      });
    }

    return connectionId;
  }

  /**
   * Gets a client connection by ID
   * @param connectionId - The ID of the connection to get
   * @returns The connection or undefined if not found
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Gets all connections (for debugging)
   * @returns Array of all connections
   */
  getConnections(): SSEConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Removes a client connection
   * @param connectionId - The ID of the connection to remove
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.controller.abort();
      this.connections.delete(connectionId);

      if (this.config.enableLogging) {
        log.info("Client disconnected", {
          connectionId,
          userId: connection.userId,
          sessionId: connection.sessionId,
          totalConnections: this.connections.size,
        });
      }
    }
  }

  /**
   * Sends an event to specific clients or broadcasts to all
   * @param event - The SSE event to send
   * @param options - Options for sending the event
   */
  async sendEvent(
    event: SSEEvent,
    options: SSESendOptions = {},
  ): Promise<void> {
    try {
      const message = this.formatSSEMessage(event);
      const targetConnections = this.getTargetConnections(options);

      if (targetConnections.length === 0) {
        if (this.config.enableLogging) {
          log.warn("No target connections found for event", {
            eventType: event.type,
            options,
          });
        }
        return;
      }

      // Send to Redis for cross-instance communication
      await this.publishToRedis(event, options);

      // Send to local connections
      for (const connection of targetConnections) {
        await this.sendToConnection(connection, message);
      }

      if (this.config.enableLogging) {
        log.info("Event sent", {
          eventType: event.type,
          targetCount: targetConnections.length,
          options,
        });
      }
    } catch (error) {
      handleError("Sending SSE event", error);
    }
  }

  /**
   * Sends a message to a specific connection
   * @param connection - The connection to send to
   * @param message - The SSE message to send
   */
  private async sendToConnection(
    connection: SSEConnection,
    message: SSEMessage,
  ): Promise<void> {
    try {
      if (!connection.isAlive) {
        return;
      }

      // Update last activity
      connection.lastActivity = Date.now();

      // Use the sendEvent function if available (for active SSE connections)
      if (connection.sendEvent) {
        const event = {
          type: message.event,
          data: JSON.parse(message.data),
          id: message.id,
          timestamp: Date.now(),
        };
        log.debug("Sending event to connection", {
          connectionId: connection.id,
          eventType: event.type,
          eventData: event.data,
        });
        connection.sendEvent(event);
        return;
      } else {
        log.warn("No sendEvent function available for connection", {
          connectionId: connection.id,
          userId: connection.userId,
        });
      }

      // Fallback: log the message (for non-active connections)
      if (this.config.enableLogging) {
        log.debug("Message sent to connection", {
          connectionId: connection.id,
          message,
        });
      }
    } catch (error) {
      log.error("Failed to send message to connection", error, {
        connectionId: connection.id,
      });
      this.removeConnection(connection.id);
    }
  }

  /**
   * Gets target connections based on send options
   * @param options - The send options
   * @returns Array of target connections
   */
  private getTargetConnections(options: SSESendOptions): SSEConnection[] {
    const connections = Array.from(this.connections.values());

    log.debug("Getting target connections", {
      options,
      totalConnections: connections.length,
      connectionUserIds: connections.map((c) => ({
        id: c.id,
        userId: c.userId,
        sessionId: c.sessionId,
      })),
    });

    if (options.broadcast) {
      return connections.filter(
        (conn) => !options.excludeConnectionIds?.includes(conn.id),
      );
    }

    if (options.connectionId) {
      const connection = this.connections.get(options.connectionId);
      return connection ? [connection] : [];
    }

    if (options.userId) {
      const targetConnections = connections.filter(
        (conn) => conn.userId === options.userId,
      );
      log.debug("Filtering by userId", {
        requestedUserId: options.userId,
        foundConnections: targetConnections.length,
        allConnections: connections.map((c) => ({
          id: c.id,
          userId: c.userId,
        })),
      });
      return targetConnections;
    }

    if (options.sessionId) {
      return connections.filter((conn) => conn.sessionId === options.sessionId);
    }

    return [];
  }

  /**
   * Formats an SSE event into the proper message format
   * @param event - The SSE event to format
   * @returns Formatted SSE message
   */
  private formatSSEMessage(event: SSEEvent): SSEMessage {
    return {
      event: event.type,
      data: JSON.stringify(event.data),
      id: event.id || event.timestamp.toString(),
    };
  }

  /**
   * Publishes event to Redis for cross-instance communication
   * @param event - The SSE event
   * @param options - The send options
   */
  private async publishToRedis(
    event: SSEEvent,
    options: SSESendOptions,
  ): Promise<void> {
    try {
      const redis = await getRedis();
      const message = {
        event,
        options,
        timestamp: Date.now(),
      };

      await redis.publish("sse:events", JSON.stringify(message));
    } catch (error) {
      log.error("Failed to publish to Redis", error);
    }
  }

  /**
   * Starts the heartbeat mechanism to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent: SSEEvent = {
        type: SSEEventType.HEARTBEAT,
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      };

      this.sendEvent(heartbeatEvent, { broadcast: true }).catch((error) => {
        log.error("Failed to send heartbeat", error);
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Starts the connection cleanup mechanism
   */
  private startConnectionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const timeoutConnections = Array.from(this.connections.values()).filter(
        (connection) =>
          now - connection.lastActivity > this.config.connectionTimeout,
      );

      for (const connection of timeoutConnections) {
        this.removeConnection(connection.id);
      }

      if (timeoutConnections.length > 0 && this.config.enableLogging) {
        log.info("Cleaned up timeout connections", {
          count: timeoutConnections.length,
          totalConnections: this.connections.size,
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Generates a unique connection ID
   * @returns Unique connection ID
   */
  private generateConnectionId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets connection statistics
   * @returns Connection statistics
   */
  getStats() {
    const connections = Array.from(this.connections.values());
    const userConnections = new Map<string, number>();
    const sessionConnections = new Map<string, number>();

    for (const conn of connections) {
      if (conn.userId) {
        userConnections.set(
          conn.userId,
          (userConnections.get(conn.userId) || 0) + 1,
        );
      }
      if (conn.sessionId) {
        sessionConnections.set(
          conn.sessionId,
          (sessionConnections.get(conn.sessionId) || 0) + 1,
        );
      }
    }

    return {
      totalConnections: this.connections.size,
      uniqueUsers: userConnections.size,
      uniqueSessions: sessionConnections.size,
      maxConnections: this.config.maxConnections,
    };
  }

  /**
   * Cleans up the service
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const connection of this.connections.values()) {
      connection.controller.abort();
    }

    this.connections.clear();
  }
}

// Export singleton instance
export const sseService = new SSEService();
