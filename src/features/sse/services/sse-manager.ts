/**
 * SSE Manager Service
 * ------------------
 * Core service for managing Server-Sent Events connections, event dispatching,
 * and connection lifecycle management.
 */

import { randomUUID } from "crypto";
import type {
  SSEConnection,
  SSEEvent,
  SSEManagerConfig,
  EventFilter,
  SSEService,
} from "../types";

export class SSEManager implements SSEService {
  private connections = new Map<string, SSEConnection>();
  private userConnections = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private readonly config: Required<SSEManagerConfig>;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 300000, // 5 minutes
      maxConnectionsPerUser: config.maxConnectionsPerUser ?? 5,
      debug: config.debug ?? false,
    };

    this.startHeartbeat();
    this.log("SSE Manager initialized");
  }

  /**
   * Create a new SSE connection
   */
  createConnection(
    response: ReadableStreamDefaultController<Uint8Array>,
    userId?: string,
    sessionId?: string,
  ): string {
    const connectionId = randomUUID();

    // Check connection limits for user
    if (
      userId &&
      this.getUserConnectionCount(userId) >= this.config.maxConnectionsPerUser
    ) {
      this.log(`Connection limit reached for user ${userId}`);
      throw new Error("Connection limit reached");
    }

    const connection: SSEConnection = {
      id: connectionId,
      userId,
      sessionId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      response,
    };

    this.connections.set(connectionId, connection);

    // Track user connections
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);
    }

    this.log(`New connection created: ${connectionId} for user: ${userId}`);

    // Send connection confirmation
    this.sendToConnection(connectionId, {
      type: "connected",
      data: { connectionId, timestamp: new Date().toISOString() },
    });

    return connectionId;
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // Remove from user connections tracking
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // Close the stream
    try {
      connection.response.close();
    } catch (error) {
      this.log(`Error closing connection ${connectionId}:`, error);
    }

    this.connections.delete(connectionId);
    this.log(`Connection removed: ${connectionId}`);

    return true;
  }

  /**
   * Send event to specific targets based on filter
   */
  async sendEvent<T>(
    event: SSEEvent<T>,
    filter?: EventFilter,
  ): Promise<number> {
    const targetConnections = this.getFilteredConnections(filter);
    let sentCount = 0;

    for (const connection of targetConnections) {
      if (this.sendToConnection(connection.id, event)) {
        sentCount++;
      }
    }

    this.log(`Sent event '${event.type}' to ${sentCount} connections`);
    return sentCount;
  }

  /**
   * Broadcast event to all connected clients
   */
  async broadcast<T>(event: SSEEvent<T>): Promise<number> {
    let sentCount = 0;

    for (const [connectionId] of this.connections) {
      if (this.sendToConnection(connectionId, event)) {
        sentCount++;
      }
    }

    this.log(`Broadcasted event '${event.type}' to ${sentCount} connections`);
    return sentCount;
  }

  /**
   * Send event to a specific connection
   */
  private sendToConnection<T>(
    connectionId: string,
    event: SSEEvent<T>,
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      const eventData = this.formatSSEEvent(event);
      const encoder = new TextEncoder();
      connection.response.enqueue(encoder.encode(eventData));
      connection.lastActivity = new Date();
      return true;
    } catch (error) {
      this.log(`Failed to send to connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }

  /**
   * Format event data for SSE protocol
   */
  private formatSSEEvent<T>(event: SSEEvent<T>): string {
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
   * Get connections based on filter criteria
   */
  private getFilteredConnections(filter?: EventFilter): SSEConnection[] {
    if (!filter) {
      return Array.from(this.connections.values());
    }

    const connections = Array.from(this.connections.values());

    return connections.filter((connection) => {
      // Include specific connections
      if (filter.connectionIds?.length) {
        if (!filter.connectionIds.includes(connection.id)) {
          return false;
        }
      }

      // Include specific users
      if (filter.userIds?.length) {
        if (!connection.userId || !filter.userIds.includes(connection.userId)) {
          return false;
        }
      }

      // Include specific sessions
      if (filter.sessionIds?.length) {
        if (
          !connection.sessionId ||
          !filter.sessionIds.includes(connection.sessionId)
        ) {
          return false;
        }
      }

      // Exclude specific connections
      if (filter.excludeConnectionIds?.includes(connection.id)) {
        return false;
      }

      // Exclude specific users
      if (
        connection.userId &&
        filter.excludeUserIds?.includes(connection.userId)
      ) {
        return false;
      }

      // Exclude specific sessions
      if (
        connection.sessionId &&
        filter.excludeSessionIds?.includes(connection.sessionId)
      ) {
        return false;
      }

      return true;
    });
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
   * Send heartbeat ping to all connections
   */
  private sendHeartbeat(): void {
    const pingEvent: SSEEvent<{ timestamp: string }> = {
      type: "ping",
      data: { timestamp: new Date().toISOString() },
    };

    this.broadcast(pingEvent);
  }

  /**
   * Remove stale connections that haven't had activity
   */
  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceActivity =
        now.getTime() - connection.lastActivity.getTime();

      if (timeSinceActivity > this.config.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      this.log(`Removing stale connection: ${connectionId}`);
      this.removeConnection(connectionId);
    }
  }

  /**
   * Get total connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connections for a specific user
   */
  getUserConnections(userId: string): SSEConnection[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return [];
    }

    return Array.from(connectionIds)
      .map((id) => this.connections.get(id))
      .filter((conn): conn is SSEConnection => conn !== undefined);
  }

  /**
   * Get connection count for a specific user
   */
  private getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size ?? 0;
  }

  /**
   * Close specific connection
   */
  closeConnection(connectionId: string): boolean {
    return this.removeConnection(connectionId);
  }

  /**
   * Close all connections for a user
   */
  closeUserConnections(userId: string): number {
    const connections = this.getUserConnections(userId);
    let closedCount = 0;

    for (const connection of connections) {
      if (this.removeConnection(connection.id)) {
        closedCount++;
      }
    }

    return closedCount;
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
    for (const [connectionId] of this.connections) {
      this.removeConnection(connectionId);
    }

    this.log("SSE Manager shutdown complete");
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[SSE Manager] ${message}`, ...args);
    }
  }
}

// Global SSE manager instance
let sseManagerInstance: SSEManager | null = null;

/**
 * Get or create the global SSE manager instance
 */
export function getSSEManager(config?: SSEManagerConfig): SSEManager {
  if (!sseManagerInstance) {
    sseManagerInstance = new SSEManager({
      debug: process.env.NODE_ENV === "development",
      ...config,
    });
  }
  return sseManagerInstance;
}

/**
 * Shutdown the global SSE manager instance
 */
export function shutdownSSEManager(): void {
  if (sseManagerInstance) {
    sseManagerInstance.shutdown();
    sseManagerInstance = null;
  }
}
