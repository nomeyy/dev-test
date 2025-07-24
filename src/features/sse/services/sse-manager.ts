import { createServiceContext } from "@/utils/service-utils";
import type { SSEConnection, SSEManagerConfig } from "../types";
import { SSEConnectionModel, SSEManagerConfigModel } from "../types";

const { log, handleError } = createServiceContext("SSEManager");

export class SSEManager {
  private connections: Map<string, SSEConnection> = new Map<
    string,
    SSEConnection
  >();
  private controllers: Map<
    string,
    ReadableStreamDefaultController<Uint8Array>
  > = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
  private config: SSEManagerConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<SSEManagerConfig>) {
    this.config = SSEManagerConfigModel.parse(config ?? {});
    this.startHeartbeat();
    this.startCleanup();
    log.info("SSE Manager initialized", { config: this.config });
  }

  addConnection(userId: string): SSEConnection {
    const connectionId = this.generateConnectionId();

    const connection: SSEConnection = {
      id: connectionId,
      userId,
      createdAt: Date.now(),
      lastPing: Date.now(),
      isActive: true,
    };

    SSEConnectionModel.parse(connection);

    if (this.connections.size >= this.config.maxConnections) {
      throw new Error(
        `Maximum connections (${this.config.maxConnections}) reached`,
      );
    }

    this.connections.set(connectionId, connection);
    log.info("SSE connection added", {
      connectionId,
      userId,
      totalConnections: this.connections.size,
    });

    return connection;
  }

  setController(
    connectionId: string,
    controller: ReadableStreamDefaultController,
  ): void {
    this.controllers.set(
      connectionId,
      controller as ReadableStreamDefaultController<Uint8Array>,
    );
  }

  getController(
    connectionId: string,
  ): ReadableStreamDefaultController<Uint8Array> | undefined {
    return this.controllers.get(connectionId);
  }

  sendEventToConnection(
    connectionId: string,
    event: Record<string, unknown>,
  ): boolean {
    const controller = this.getController(connectionId);
    if (!controller) {
      log.warn("No controller found for connection", { connectionId });
      return false;
    }

    try {
      const eventString = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(new TextEncoder().encode(eventString));
      return true;
    } catch (error) {
      log.error("Error sending event to connection", { connectionId, error });
      return false;
    }
  }

  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      log.warn("Attempted to remove non-existent connection", { connectionId });
      return false;
    }

    this.connections.delete(connectionId);
    this.controllers.delete(connectionId);
    log.info("SSE connection removed", {
      connectionId,
      userId: connection.userId,
      totalConnections: this.connections.size,
    });

    return true;
  }

  getUserConnections(userId: string): SSEConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId && conn.isActive,
    );
  }

  getAllConnections(): SSEConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.isActive,
    );
  }

  updatePing(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.lastPing = Date.now();
    connection.isActive = true;
    return true;
  }

  getStats() {
    const totalConnections = this.connections.size;
    const activeConnections = this.getAllConnections().length;
    const uniqueUsers = new Set(
      this.getAllConnections().map((conn) => conn.userId),
    ).size;

    return {
      totalConnections,
      activeConnections,
      uniqueUsers,
      maxConnections: this.config.maxConnections,
    };
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const activeConnections = this.getAllConnections();
      log.debug("Sending heartbeat to connections", {
        count: activeConnections.length,
      });

      // Heartbeat logic will be handled by the SSE endpoint
      // This just logs for monitoring
    }, this.config.heartbeatInterval);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = now - this.config.heartbeatInterval * 2; // 2x heartbeat interval

      let cleanedCount = 0;

      for (const [connectionId, connection] of this.connections.entries()) {
        if (connection.lastPing < staleThreshold) {
          connection.isActive = false;
          this.connections.delete(connectionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        log.info("Cleaned up stale SSE connections", {
          cleanedCount,
          remainingConnections: this.connections.size,
        });
      }
    }, this.config.cleanupInterval);
  }

  private generateConnectionId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.clear();
    log.info("SSE Manager destroyed");
  }
}

// Singleton instance
export const sseManager = new SSEManager();
