import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEServiceInterface,
  SSEClientConnection,
  SSEEventUnion,
  PingEvent,
} from "../types";
import { SSEEventType } from "../types";
import { nanoid } from "nanoid";

const { log } = createServiceContext("SSEService");

/**
 * SSE Connection Manager Service
 * Manages client connections, event dispatching, and heartbeat functionality
 */
class SSEService implements SSEServiceInterface {
  private connections = new Map<string, SSEClientConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds

  constructor() {
    log.info("SSE Service initialized");
  }

  // Connection Management
  addConnection(connection: SSEClientConnection): void {
    this.connections.set(connection.id, connection);
    log.info("Client connected", {
      connectionId: connection.id,
      userId: connection.userId,
      totalConnections: this.connections.size,
    });

    // Start heartbeat if this is the first connection
    if (this.connections.size === 1) {
      this.startHeartbeat();
    }
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        // Check if controller is not already closed before attempting to close
        if (connection.controller.desiredSize !== null) {
          connection.controller.close();
        }
      } catch (error) {
        // Ignore "already closed" errors as they're harmless
        if (
          error instanceof Error &&
          !error.message.includes("already closed")
        ) {
          log.warn("Error closing connection controller", {
            connectionId,
            error,
          });
        }
      }

      this.connections.delete(connectionId);
      log.info("Client disconnected", {
        connectionId,
        userId: connection.userId,
        totalConnections: this.connections.size,
      });

      // Stop heartbeat if no connections remain
      if (this.connections.size === 0) {
        this.stopHeartbeat();
      }
    }
  }

  getConnection(connectionId: string): SSEClientConnection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionsByUserId(userId: string): SSEClientConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId,
    );
  }

  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  getAllConnections(): SSEClientConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionDetails(): Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
    lastPing: Date;
  }> {
    return Array.from(this.connections.values()).map((conn) => ({
      id: conn.id,
      userId: conn.userId,
      sessionId: conn.sessionId,
      connectedAt: conn.connectedAt,
      lastPing: conn.lastPing,
    }));
  }

  // Event Sending
  async sendEventToConnection(
    connectionId: string,
    event: SSEEventUnion,
  ): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      log.warn("Attempted to send event to non-existent connection", {
        connectionId,
        eventType: event.type,
      });
      return false;
    }

    try {
      const eventData = this.formatSSEEvent(event);
      const encoder = new TextEncoder();
      connection.controller.enqueue(encoder.encode(eventData));

      log.debug("Event sent to connection", {
        connectionId,
        eventType: event.type,
        userId: connection.userId,
      });

      return true;
    } catch (error) {
      log.error("Failed to send event to connection", {
        connectionId,
        eventType: event.type,
        error,
      });

      // Remove dead connection
      this.removeConnection(connectionId);
      return false;
    }
  }

  async sendEventToUser(userId: string, event: SSEEventUnion): Promise<number> {
    const userConnections = this.getConnectionsByUserId(userId);
    let successCount = 0;

    for (const connection of userConnections) {
      const success = await this.sendEventToConnection(connection.id, event);
      if (success) successCount++;
    }

    log.info("Event sent to user connections", {
      userId,
      eventType: event.type,
      totalConnections: userConnections.length,
      successfulSends: successCount,
    });

    return successCount;
  }

  async sendEventToConnections(
    connectionIds: string[],
    event: SSEEventUnion,
  ): Promise<number> {
    let successCount = 0;

    for (const connectionId of connectionIds) {
      const success = await this.sendEventToConnection(connectionId, event);
      if (success) successCount++;
    }

    log.info("Event sent to selected connections", {
      eventType: event.type,
      targetConnections: connectionIds.length,
      successfulSends: successCount,
    });

    return successCount;
  }

  async broadcastEvent(event: SSEEventUnion): Promise<number> {
    const connectionIds = Array.from(this.connections.keys());
    let successCount = 0;

    for (const connectionId of connectionIds) {
      const success = await this.sendEventToConnection(connectionId, event);
      if (success) successCount++;
    }

    log.info("Event broadcasted", {
      eventType: event.type,
      totalConnections: connectionIds.length,
      successfulSends: successCount,
    });

    return successCount;
  }

  // Heartbeat Management
  startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    log.info("Starting heartbeat");
    this.heartbeatInterval = setInterval(() => {
      void this.pingAllConnections();
      this.cleanupStaleConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      log.info("Heartbeat stopped");
    }
  }

  async pingConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    const pingEvent: PingEvent = {
      id: nanoid(),
      type: SSEEventType.PING,
      timestamp: Date.now(),
      data: { message: "ping" },
    };

    const success = await this.sendEventToConnection(connectionId, pingEvent);
    if (success) {
      connection.lastPing = new Date();
    }

    return success;
  }

  async pingAllConnections(): Promise<number> {
    const connectionIds = Array.from(this.connections.keys());
    let successCount = 0;

    for (const connectionId of connectionIds) {
      const success = await this.pingConnection(connectionId);
      if (success) successCount++;
    }

    if (connectionIds.length > 0) {
      log.debug("Heartbeat ping sent", {
        totalConnections: connectionIds.length,
        successfulPings: successCount,
      });
    }

    return successCount;
  }

  // Utility Methods
  private formatSSEEvent(event: SSEEventUnion): string {
    return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify({
      ...event,
    })}\n\n`;
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
      if (timeSinceLastPing > this.CONNECTION_TIMEOUT) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      log.warn("Removing stale connection", { connectionId });
      this.removeConnection(connectionId);
    }
  }

  // Cleanup
  cleanup(): void {
    log.info("Cleaning up SSE service");
    this.stopHeartbeat();

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }
  }
}

// Global singleton instance for development hot reloading
declare global {
  var __sseService: SSEService | undefined;
}

// Export singleton instance that persists across hot reloads
export const sseService = globalThis.__sseService ?? new SSEService();

// Store in global for development hot reloading
if (process.env.NODE_ENV === "development") {
  globalThis.__sseService = sseService;
}
