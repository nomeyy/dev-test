import type {
  SSEConnection,
  SSEEvent,
  SSEManagerConfig,
  SSEMessage,
} from "../types";

/**
 * Centralized SSE Manager for handling client connections and event dispatching
 */
export class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: SSEManagerConfig;

  constructor(config: Partial<SSEManagerConfig> = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 300000, // 5 minutes
      maxConnections: config.maxConnections ?? 1000,
      ...config,
    };

    this.startHeartbeat();
  }

  /**
   * Add a new SSE connection
   */
  public addConnection(
    connectionId: string,
    controller: ReadableStreamDefaultController,
    userId?: string,
    sessionId?: string,
  ): void {
    // Check max connections limit
    if (this.connections.size >= this.config.maxConnections) {
      controller.error(new Error("Maximum connections exceeded"));
      return;
    }

    const connection: SSEConnection = {
      id: connectionId,
      userId,
      sessionId,
      controller,
      lastPing: Date.now(),
      connected: true,
    };

    this.connections.set(connectionId, connection);
    console.log(`SSE connection added: ${connectionId}`, {
      userId,
      sessionId,
      totalConnections: this.connections.size,
    });

    // Send initial connection confirmation
    this.sendEvent(connectionId, {
      type: "connection",
      data: { status: "connected", connectionId },
    });
  }

  /**
   * Remove an SSE connection
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      if (connection.connected) {
        connection.controller.close();
      }
    } catch (error) {
      console.error(`Error closing SSE connection ${connectionId}:`, error);
    }

    this.connections.delete(connectionId);
    console.log(`SSE connection removed: ${connectionId}`, {
      remainingConnections: this.connections.size,
    });
  }

  /**
   * Send an event to a specific connection
   */
  public sendEvent(connectionId: string, event: SSEEvent): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      return false;
    }

    try {
      const message = this.formatSSEMessage({
        event: event.type,
        data: JSON.stringify(event.data),
        id: event.id,
        retry: event.retry,
      });

      connection.controller.enqueue(new TextEncoder().encode(message));
      connection.lastPing = Date.now();
      return true;
    } catch (error) {
      console.error(`Error sending SSE event to ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }

  /**
   * Broadcast an event to all connections
   */
  public broadcast(event: SSEEvent): number {
    let successCount = 0;
    const connectionIds = Array.from(this.connections.keys());

    for (const connectionId of connectionIds) {
      if (this.sendEvent(connectionId, event)) {
        successCount++;
      }
    }

    console.log(
      `Broadcasted event "${event.type}" to ${successCount}/${connectionIds.length} connections`,
    );
    return successCount;
  }

  /**
   * Send an event to all connections for a specific user
   */
  public sendToUser(userId: string, event: SSEEvent): number {
    let successCount = 0;
    const userConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId,
    );

    for (const connection of userConnections) {
      if (this.sendEvent(connection.id, event)) {
        successCount++;
      }
    }

    console.log(
      `Sent event "${event.type}" to user ${userId}: ${successCount} connections`,
    );
    return successCount;
  }

  /**
   * Send an event to all connections for a specific session
   */
  public sendToSession(sessionId: string, event: SSEEvent): number {
    let successCount = 0;
    const sessionConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.sessionId === sessionId,
    );

    for (const connection of sessionConnections) {
      if (this.sendEvent(connection.id, event)) {
        successCount++;
      }
    }

    console.log(
      `Sent event "${event.type}" to session ${sessionId}: ${successCount} connections`,
    );
    return successCount;
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    const now = Date.now();
    const activeConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.connected,
    );

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      userConnections: new Set(
        activeConnections.map((conn) => conn.userId).filter(Boolean),
      ).size,
      sessionConnections: new Set(
        activeConnections.map((conn) => conn.sessionId).filter(Boolean),
      ).size,
      averageConnectionAge:
        activeConnections.length > 0
          ? (now -
              activeConnections.reduce((sum, conn) => sum + conn.lastPing, 0) /
                activeConnections.length) /
            1000
          : 0,
    };
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
   * Send heartbeat to all connections
   */
  private sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      type: "heartbeat",
      data: { timestamp: Date.now() },
    };

    let successCount = 0;
    const connectionIds = Array.from(this.connections.keys());

    for (const connectionId of connectionIds) {
      if (this.sendEvent(connectionId, heartbeatEvent)) {
        successCount++;
      }
    }

    if (connectionIds.length > 0) {
      console.log(
        `Heartbeat sent to ${successCount}/${connectionIds.length} connections`,
      );
    }
  }

  /**
   * Clean up stale connections that haven't responded to heartbeats
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastPing > this.config.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      console.log(`Removing stale SSE connection: ${connectionId}`);
      this.removeConnection(connectionId);
    }
  }

  /**
   * Format SSE message according to specification
   */
  private formatSSEMessage(message: SSEMessage): string {
    let formatted = "";

    if (message.event) {
      formatted += `event: ${message.event}\n`;
    }

    if (message.id) {
      formatted += `id: ${message.id}\n`;
    }

    if (message.retry) {
      formatted += `retry: ${message.retry}\n`;
    }

    // Handle multi-line data
    const dataLines = message.data.split("\n");
    for (const line of dataLines) {
      formatted += `data: ${line}\n`;
    }

    formatted += "\n"; // Empty line to indicate end of message
    return formatted;
  }

  /**
   * Cleanup all connections and stop heartbeat
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      this.removeConnection(connectionId);
    }

    console.log("SSE Manager destroyed");
  }
}

// Singleton instance for the application
export const sseManager = new SSEManager();
