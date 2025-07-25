import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEConnection,
  SSEEvent,
  SendEventOptions,
  SSEManagerConfig,
  ConnectionStats,
  SSEBackend,
} from "../types";

/**
 * SSE Manager - Centralized management of Server-Sent Event connections
 * Handles connection lifecycle, event dispatching, and heartbeat maintenance
 */
export class SSEManager implements SSEBackend {
  private connections = new Map<string, SSEConnection>();
  private userConnections = new Map<string, Set<string>>();
  private sessionConnections = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEManagerConfig>;
  private log: ReturnType<typeof createServiceContext>["log"];
  private handleError: ReturnType<typeof createServiceContext>["handleError"];

  constructor(config: SSEManagerConfig = {}) {
    const context = createServiceContext("SSEManager");
    this.log = context.log;
    this.handleError = context.handleError;
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 60000, // 60 seconds
      maxConnectionsPerUser: config.maxConnectionsPerUser ?? 50, // Increased from 2 to 50 - allow many tabs
      enableLogging: config.enableLogging ?? true,
    };

    this.startHeartbeat();
    this.log.info("SSE Manager initialized", { config: this.config });
  }

  /**
   * Add a new SSE connection
   */
  addConnection(connection: SSEConnection): void {
    try {
      // Store connection
      this.connections.set(connection.id, connection);

      // Index by user
      if (connection.userId) {
        if (!this.userConnections.has(connection.userId)) {
          this.userConnections.set(connection.userId, new Set());
        }
        this.userConnections.get(connection.userId)!.add(connection.id);
      }

      // Index by session
      if (connection.sessionId) {
        if (!this.sessionConnections.has(connection.sessionId)) {
          this.sessionConnections.set(connection.sessionId, new Set());
        }
        this.sessionConnections.get(connection.sessionId)!.add(connection.id);
      }

      if (this.config.enableLogging) {
        this.log.info("Connection added", {
          connectionId: connection.id,
          userId: connection.userId,
          sessionId: connection.sessionId,
          totalConnections: this.connections.size,
        });
      }
    } catch (error) {
      this.handleError("addConnection", error);
    }
  }

  /**
   * Remove a connection and clean up indexes
   */
  removeConnection(connectionId: string): void {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Remove from main map
      this.connections.delete(connectionId);

      // Clean up user index
      if (connection.userId) {
        const userConns = this.userConnections.get(connection.userId);
        if (userConns) {
          userConns.delete(connectionId);
          if (userConns.size === 0) {
            this.userConnections.delete(connection.userId);
          }
        }
      }

      // Clean up session index
      if (connection.sessionId) {
        const sessionConns = this.sessionConnections.get(connection.sessionId);
        if (sessionConns) {
          sessionConns.delete(connectionId);
          if (sessionConns.size === 0) {
            this.sessionConnections.delete(connection.sessionId);
          }
        }
      }

      // Close the stream
      try {
        connection.controller.close();
      } catch (error) {
        // Stream might already be closed
        this.log.debug("Error closing stream", { error });
      }

      if (this.config.enableLogging) {
        this.log.info("Connection removed", {
          connectionId,
          userId: connection.userId,
          sessionId: connection.sessionId,
          totalConnections: this.connections.size,
        });
      }
    } catch (error) {
      this.log.error("Error removing connection", error, { connectionId });
    }
  }

  /**
   * Send event to specific targets
   */
  async sendEvent(
    event: SSEEvent,
    options: SendEventOptions = {},
  ): Promise<void> {
    try {
      const targetConnections = this.getTargetConnections(options);

      if (targetConnections.length === 0) {
        this.log.warn("No target connections found for event", {
          event: event.event,
          options,
        });
        return;
      }

      const eventData = this.formatSSEEvent(event);
      const failedConnections: string[] = [];

      // Send to all target connections
      for (const connection of targetConnections) {
        try {
          await this.sendToConnection(connection, eventData);
          connection.lastActivity = new Date();
        } catch (error) {
          failedConnections.push(connection.id);
          this.log.warn("Failed to send event to connection", error, {
            connectionId: connection.id,
            event: event.event,
          });
        }
      }

      // Clean up failed connections
      for (const connectionId of failedConnections) {
        this.removeConnection(connectionId);
      }

      if (this.config.enableLogging) {
        this.log.info("Event sent", {
          event: event.event,
          targetCount: targetConnections.length,
          failedCount: failedConnections.length,
        });
      }
    } catch (error) {
      this.handleError("sendEvent", error);
    }
  }

  /**
   * Broadcast event to all connections
   */
  async broadcast(event: SSEEvent, exclude: string[] = []): Promise<void> {
    return this.sendEvent(event, { broadcast: true, exclude });
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    const connections = Array.from(this.connections.values());
    const now = Date.now();

    const connectionsByUser: Record<string, number> = {};
    const connectionsBySession: Record<string, number> = {};
    let totalDuration = 0;

    for (const conn of connections) {
      if (conn.userId) {
        connectionsByUser[conn.userId] =
          (connectionsByUser[conn.userId] ?? 0) + 1;
      }
      if (conn.sessionId) {
        connectionsBySession[conn.sessionId] =
          (connectionsBySession[conn.sessionId] ?? 0) + 1;
      }
      totalDuration += now - conn.connectedAt.getTime();
    }

    return {
      totalConnections: connections.length,
      connectionsByUser,
      connectionsBySession,
      averageConnectionDuration:
        connections.length > 0 ? totalDuration / connections.length : 0,
    };
  }

  /**
   * Close specific connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    this.removeConnection(connectionId);
  }

  /**
   * Close all connections for a user
   */
  async closeUserConnections(userId: string): Promise<void> {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return;

    for (const connectionId of Array.from(connectionIds)) {
      this.removeConnection(connectionId);
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      void (async () => {
        try {
          await this.sendHeartbeat();
          this.cleanupStaleConnections();
        } catch (error) {
          this.log.error("Heartbeat error", error);
        }
      })();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat to all connections
   */
  private async sendHeartbeat(): Promise<void> {
    const heartbeatEvent: SSEEvent = {
      event: "heartbeat",
      data: { timestamp: Date.now() },
    };

    await this.broadcast(heartbeatEvent);
  }

  /**
   * Clean up stale connections that haven't received heartbeat
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [id, connection] of this.connections) {
      const timeSinceActivity = now - connection.lastActivity.getTime();
      if (timeSinceActivity > this.config.connectionTimeout) {
        staleConnections.push(id);
      }
    }

    for (const connectionId of staleConnections) {
      this.log.info("Removing stale connection", { connectionId });
      this.removeConnection(connectionId);
    }
  }

  /**
   * Check if user has reached connection limit
   */
  private checkConnectionLimit(userId: string): boolean {
    const userConns = this.userConnections.get(userId);
    return userConns
      ? userConns.size >= this.config.maxConnectionsPerUser
      : false;
  }

  /**
   * Get target connections based on options
   */
  private getTargetConnections(options: SendEventOptions): SSEConnection[] {
    const targets = new Set<string>();

    // Broadcast to all
    if (options.broadcast) {
      for (const connectionId of this.connections.keys()) {
        targets.add(connectionId);
      }
    }

    // Target specific connection IDs
    if (options.connectionIds) {
      for (const id of options.connectionIds) {
        targets.add(id);
      }
    }

    // Target by user IDs
    if (options.userIds) {
      for (const userId of options.userIds) {
        const userConns = this.userConnections.get(userId);
        if (userConns) {
          for (const connectionId of userConns) {
            targets.add(connectionId);
          }
        }
      }
    }

    // Target by session IDs
    if (options.sessionIds) {
      for (const sessionId of options.sessionIds) {
        const sessionConns = this.sessionConnections.get(sessionId);
        if (sessionConns) {
          for (const connectionId of sessionConns) {
            targets.add(connectionId);
          }
        }
      }
    }

    // Exclude specific connections
    if (options.exclude) {
      for (const excludeId of options.exclude) {
        targets.delete(excludeId);
      }
    }

    // Return actual connection objects
    return Array.from(targets)
      .map((id) => this.connections.get(id))
      .filter((conn): conn is SSEConnection => conn !== undefined);
  }

  /**
   * Format SSE event for transmission
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = "";

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    formatted += `event: ${event.event}\n`;
    formatted += `data: ${JSON.stringify(event.data)}\n`;

    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    formatted += "\n";
    return formatted;
  }

  /**
   * Send data to a specific connection
   */
  private async sendToConnection(
    connection: SSEConnection,
    data: string,
  ): Promise<void> {
    try {
      const encoder = new TextEncoder();
      connection.controller.enqueue(encoder.encode(data));
    } catch (error) {
      connection.status = "error";
      throw error;
    }
  }

  /**
   * Cleanup resources when shutting down
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }

    this.log.info("SSE Manager destroyed");
  }
}

// Singleton instance
export const sseManager = new SSEManager();
