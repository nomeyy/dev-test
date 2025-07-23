import { logger } from "@/utils/logging";
import type {
  SSEConnection,
  SSEEvent,
  SSEManagerConfig,
  SendEventOptions,
} from "../types";

class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private userConnections = new Map<string, Set<string>>();
  private sessionConnections = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private config: SSEManagerConfig = {
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 60000, // 60 seconds
    maxConnections: 1000,
  };

  constructor(config?: Partial<SSEManagerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startHeartbeat();
  }

  /**
   * Add a new SSE connection
   */
  addConnection(
    connectionId: string,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    userId?: string,
    sessionId?: string,
  ): boolean {
    try {
      if (this.connections.size >= this.config.maxConnections) {
        logger.warn("SSE connection limit", "Maximum connections reached");
        return false;
      }

      const connection: SSEConnection = {
        id: connectionId,
        userId,
        sessionId,
        writer,
        lastPing: Date.now(),
        isActive: true,
      };

      this.connections.set(connectionId, connection);

      // Track by userId if provided
      if (userId) {
        if (!this.userConnections.has(userId)) {
          this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId)!.add(connectionId);
      }

      // Track by sessionId if provided
      if (sessionId) {
        if (!this.sessionConnections.has(sessionId)) {
          this.sessionConnections.set(sessionId, new Set());
        }
        this.sessionConnections.get(sessionId)!.add(connectionId);
      }

      logger.info("SSE connection added", connectionId);

      // Send initial connection event
      this.sendToConnection(connectionId, {
        type: "connection",
        data: { status: "connected", connectionId },
      });

      return true;
    } catch (error) {
      logger.error("Failed to add SSE connection", connectionId);
      return false;
    }
  }

  /**
   * Remove a connection and clean up references
   */
  removeConnection(connectionId: string): void {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Mark connection as inactive (don't manually close writer)
      connection.isActive = false;

      // Remove from main connections map
      this.connections.delete(connectionId);

      // Clean up user connections
      if (connection.userId) {
        const userConns = this.userConnections.get(connection.userId);
        if (userConns) {
          userConns.delete(connectionId);
          if (userConns.size === 0) {
            this.userConnections.delete(connection.userId);
          }
        }
      }

      // Clean up session connections
      if (connection.sessionId) {
        const sessionConns = this.sessionConnections.get(connection.sessionId);
        if (sessionConns) {
          sessionConns.delete(connectionId);
          if (sessionConns.size === 0) {
            this.sessionConnections.delete(connection.sessionId);
          }
        }
      }

      logger.info("SSE connection removed", connectionId);
    } catch (error) {
      logger.error("Failed to remove SSE connection", connectionId);
    }
  }

  /**
   * Send event to a specific connection
   */
  async sendToConnection(
    connectionId: string,
    event: SSEEvent,
  ): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      return false;
    }

    try {
      const formattedEvent = this.formatSSEEvent(event);
      await connection.writer.write(new TextEncoder().encode(formattedEvent));
      return true;
    } catch (error) {
      logger.error("Failed to send event to connection", connectionId);
      // Mark connection as inactive and remove it
      connection.isActive = false;
      this.removeConnection(connectionId);
      return false;
    }
  }

  /**
   * Send event with flexible targeting options
   */
  async sendEvent(
    event: SSEEvent,
    options: SendEventOptions = {},
  ): Promise<number> {
    let targetConnections: string[] = [];

    if (options.connectionId) {
      // Send to specific connection
      targetConnections = [options.connectionId];
    } else if (options.userId) {
      // Send to all connections for a specific user
      const userConns = this.userConnections.get(options.userId);
      targetConnections = userConns ? Array.from(userConns) : [];
    } else if (options.sessionId) {
      // Send to all connections for a specific session
      const sessionConns = this.sessionConnections.get(options.sessionId);
      targetConnections = sessionConns ? Array.from(sessionConns) : [];
    } else if (options.broadcast) {
      // Broadcast to all connections
      targetConnections = Array.from(this.connections.keys());
    }

    let successCount = 0;
    const promises = targetConnections.map(async (connectionId) => {
      const success = await this.sendToConnection(connectionId, event);
      if (success) successCount++;
    });

    await Promise.all(promises);

    logger.info("SSE event sent", event.type);

    return successCount;
  }

  /**
   * Start heartbeat mechanism to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleConnections();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat to all active connections
   */
  private async sendHeartbeat(): Promise<void> {
    const heartbeatEvent: SSEEvent = {
      type: "heartbeat",
      data: { timestamp: Date.now() },
    };

    const activeConnections = Array.from(this.connections.entries()).filter(
      ([_, conn]) => conn.isActive,
    );

    const promises = activeConnections.map(
      async ([connectionId, connection]) => {
        try {
          await this.sendToConnection(connectionId, heartbeatEvent);
          connection.lastPing = Date.now();
        } catch (error) {
          logger.warn("Failed to send heartbeat", connectionId);
        }
      },
    );

    await Promise.all(promises);
  }

  /**
   * Clean up stale connections that haven't responded to heartbeats
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastPing > this.config.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }

    staleConnections.forEach((connectionId) => {
      logger.info("Removing stale connection", connectionId);
      this.removeConnection(connectionId);
    });
  }

  /**
   * Format SSE event according to the specification
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = "";

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    formatted += `event: ${event.type}\n`;
    formatted += `data: ${JSON.stringify(event.data)}\n\n`;

    return formatted;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      userConnections: this.userConnections.size,
      sessionConnections: this.sessionConnections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        (conn) => conn.isActive,
      ).length,
    };
  }

  /**
   * Shutdown the SSE manager
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }

    logger.info("SSE Manager shutdown complete", "shutdown");
  }
}

// Singleton instance
let sseManagerInstance: SSEManager | null = null;

export function getSSEManager(): SSEManager {
  if (!sseManagerInstance) {
    sseManagerInstance = new SSEManager();
  }
  return sseManagerInstance;
}

export { SSEManager };
