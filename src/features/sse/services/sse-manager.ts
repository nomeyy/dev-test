import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEManager,
  SSEConnection,
  SSEEvent,
  SSEManagerConfig,
  HeartbeatEventData,
} from "../types";

const { log, handleError } = createServiceContext("SSEManager");

const DEFAULT_CONFIG: SSEManagerConfig = {
  heartbeatInterval: 60000,
  connectionTimeout: 60000,
  maxConnectionsPerUser: 5,
  enableCleanup: true,
  cleanupInterval: 60000,
};

export class SSEConnectionManager implements SSEManager {
  private connections = new Map<
    string,
    {
      connection: SSEConnection;
      writer: WritableStreamDefaultWriter<Uint8Array>;
    }
  >();

  private userConnections = new Map<string, Set<string>>();
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private config: SSEManagerConfig;

  constructor(config: Partial<SSEManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableCleanup) {
      this.startCleanupInterval();
    }

    this.startHeartbeatInterval();

    log.info("SSE Manager initialized", {
      heartbeatInterval: this.config.heartbeatInterval,
      connectionTimeout: this.config.connectionTimeout,
      maxConnectionsPerUser: this.config.maxConnectionsPerUser,
    });
  }

  // Add new connection
  addConnection(
    userId: string,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    metadata: Partial<SSEConnection> = {},
  ): string {
    try {
      // Check connection limits
      const existingConnections = this.getUserConnections(userId);
      if (existingConnections.length >= this.config.maxConnectionsPerUser) {
        // Remove oldest connection
        const oldestConnection = existingConnections.sort(
          (a, b) => a.connectedAt.getTime() - b.connectedAt.getTime(),
        )[0];

        if (oldestConnection) {
          log.info("Removing oldest connection due to limit", {
            userId,
            oldConnectionId: oldestConnection.connectionId,
            limit: this.config.maxConnectionsPerUser,
          });
          this.removeConnection(oldestConnection.connectionId);
        }
      }

      const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const connection: SSEConnection = {
        userId,
        connectionId,
        connectedAt: now,
        lastHeartbeat: now,
        userAgent: metadata.userAgent,
        clientIp: metadata.clientIp,
      };

      this.connections.set(connectionId, { connection, writer });

      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);

      log.info("SSE connection added", {
        userId,
        connectionId,
        totalConnections: this.connections.size,
        userConnections: this.userConnections.get(userId)?.size ?? 0,
      });

      // Send initial connection status
      void this.sendToConnection(connectionId, {
        type: "connection_status",
        data: {
          status: "connected",
          connectionId,
          timestamp: Date.now(),
        },
      }).catch((error) => {
        log.error("Failed to send connection status", error);
      });

      return connectionId;
    } catch (error) {
      return handleError("adding SSE connection", error);
    }
  }

  // Remove an SSE connection
  removeConnection(connectionId: string): boolean {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) {
        return false;
      }

      const { connection, writer } = connectionData;

      try {
        void writer.close().catch((error: unknown) => {
          log.warn("Error closing SSE writer", { connectionId, error });
        });
      } catch (error) {
        log.warn("Error closing SSE writer", { connectionId, error });
      }

      this.connections.delete(connectionId);

      const userConnectionSet = this.userConnections.get(connection.userId);
      if (userConnectionSet) {
        userConnectionSet.delete(connectionId);
        if (userConnectionSet.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }

      log.info("SSE connection removed", {
        userId: connection.userId,
        connectionId,
        totalConnections: this.connections.size,
      });

      return true;
    } catch (error) {
      log.error("Error removing SSE connection", error, { connectionId });
      return false;
    }
  }

  // Get all connections for a user
  getUserConnections(userId: string): SSEConnection[] {
    const connectionIds = this.userConnections.get(userId) ?? new Set();
    return Array.from(connectionIds)
      .map((id) => this.connections.get(id)?.connection)
      .filter((conn): conn is SSEConnection => conn !== undefined);
  }

  // Get all active connections
  getAllConnections(): SSEConnection[] {
    return Array.from(this.connections.values()).map(
      ({ connection }) => connection,
    );
  }

  // Send event to a specific connection
  async sendToConnection(
    connectionId: string,
    event: SSEEvent,
  ): Promise<boolean> {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) {
        log.warn("Connection not found", { connectionId });
        return false;
      }

      const { writer, connection } = connectionData;
      const sseData = this.formatSSEMessage(event);

      await writer.write(new TextEncoder().encode(sseData));

      // Update last heartbeat if this is a heartbeat event
      if (event.type === "heartbeat") {
        connection.lastHeartbeat = new Date();
      }

      return true;
    } catch (error) {
      log.error("Failed to send SSE message", error, {
        connectionId,
        eventType: event.type,
      });

      // Remove failed connection
      this.removeConnection(connectionId);
      return false;
    }
  }

  // Send event to all connections of a user
  async sendToUser(userId: string, event: SSEEvent): Promise<number> {
    const connectionIds = this.userConnections.get(userId) ?? new Set();
    let successCount = 0;

    const promises = Array.from(connectionIds).map(async (connectionId) => {
      const success = await this.sendToConnection(connectionId, event);
      if (success) successCount++;
    });

    await Promise.all(promises);

    log.info("Sent event to user connections", {
      userId,
      eventType: event.type,
      totalConnections: connectionIds.size,
      successfulSends: successCount,
    });

    return successCount;
  }

  // Broadcast event to all connections
  async broadcast(event: SSEEvent): Promise<number> {
    const allConnectionIds = Array.from(this.connections.keys());
    let successCount = 0;

    const promises = allConnectionIds.map(async (connectionId) => {
      const success = await this.sendToConnection(connectionId, event);
      if (success) successCount++;
    });

    await Promise.all(promises);

    log.info("Broadcasted event to all connections", {
      eventType: event.type,
      totalConnections: allConnectionIds.length,
      successfulSends: successCount,
    });

    return successCount;
  }

  // Maintain connections by sending periodic heartbeats
  async sendHeartbeat(connectionId?: string): Promise<void> {
    const heartbeatEvent: SSEEvent = {
      type: "heartbeat",
      data: {
        timestamp: Date.now(),
        connectionId: connectionId ?? "broadcast",
      } as HeartbeatEventData,
    };

    if (connectionId) {
      await this.sendToConnection(connectionId, heartbeatEvent);
    } else {
      await this.broadcast(heartbeatEvent);
    }
  }

  // Clean up inactive connections
  cleanup(): number {
    const now = Date.now();
    const timeoutMs = this.config.connectionTimeout;
    let cleanedCount = 0;

    const connectionsToRemove: string[] = [];

    for (const [connectionId, { connection }] of this.connections) {
      const timeSinceLastHeartbeat = now - connection.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > timeoutMs) {
        connectionsToRemove.push(connectionId);
      }
    }

    for (const connectionId of connectionsToRemove) {
      if (this.removeConnection(connectionId)) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.info("Cleaned up inactive connections", {
        cleanedCount,
        remainingConnections: this.connections.size,
      });
    }

    return cleanedCount;
  }

  // Start periodic heartbeat
  private startHeartbeatInterval(): void {
    this.heartbeatInterval = setInterval(() => {
      void this.sendHeartbeat().catch((error) => {
        log.error("Error sending heartbeat", error);
      });
    }, this.config.heartbeatInterval);
  }

  // Start periodic cleanup
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanup();
      } catch (error) {
        log.error("Error during cleanup", error);
      }
    }, this.config.cleanupInterval);
  }

  // Format SSE message
  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.type) {
      message += `event: ${event.type}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);

    // Split multi-line data
    const dataLines = data.split("\n");
    for (const line of dataLines) {
      message += `data: ${line}\n`;
    }

    message += "\n";

    return message;
  }

  // Cleanup resources
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }

    log.info("SSE Manager destroyed");
  }
}

// singleton instance
export const sseManager = new SSEConnectionManager();
