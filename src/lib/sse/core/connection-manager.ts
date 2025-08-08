/**
 * Connection Manager
 *
 * Manages SSE connection lifecycle, tracking, and indexing
 */

import type {
  Connection,
  ConnectionOptions,
  ConnectionResult,
  ClientId,
  UserId,
  SessionId,
  ConnectionState,
  SSEErrorCode,
  Result,
} from "../types";
import { SSEError as SSEErrorClass } from "../types";

export interface IConnectionManager {
  // Lifecycle
  createConnection(options: ConnectionOptions): Result<ConnectionResult>;
  removeConnection(clientId: ClientId, reason?: string): Result<void>;

  // Queries
  getConnection(clientId: ClientId): Connection | undefined;
  getConnectionsByUser(userId: UserId): Connection[];
  getConnectionsBySession(sessionId: SessionId): Connection[];
  getAllConnections(): Map<ClientId, Connection>;
  hasConnection(clientId: ClientId): boolean;

  // State Management
  updateConnectionState(
    clientId: ClientId,
    state: ConnectionState,
  ): Result<void>;
  updateLastActivity(clientId: ClientId): Result<void>;

  // Cleanup
  cleanupStaleConnections(timeout: number): number;

  // Statistics
  getConnectionCount(): number;
  getUserCount(): number;
  getSessionCount(): number;
}

export class ConnectionManager implements IConnectionManager {
  private connections: Map<ClientId, Connection>;
  private userIndex: Map<UserId, Set<ClientId>>;
  private sessionIndex: Map<SessionId, Set<ClientId>>;
  private readonly maxConnections: number;
  private connectionCounter = 0;

  constructor(maxConnections = 10000) {
    this.connections = new Map();
    this.userIndex = new Map();
    this.sessionIndex = new Map();
    this.maxConnections = maxConnections;
  }

  /**
   * Create a new SSE connection
   */
  createConnection(options: ConnectionOptions): Result<ConnectionResult> {
    try {
      // Check capacity
      if (this.connections.size >= this.maxConnections) {
        return {
          success: false,
          error: new SSEErrorClass(
            "MAX_CONNECTIONS_REACHED" as SSEErrorCode,
            `Maximum connections (${this.maxConnections}) reached`,
            { current: this.connections.size, max: this.maxConnections },
          ),
        };
      }

      // Generate unique client ID
      const clientId = this.generateClientId();
      const encoder = new TextEncoder();

      // Pre-create the connection object (will be updated with controller)
      const connection: Connection = {
        id: clientId,
        userId: options.userId,
        sessionId: options.sessionId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        state: "connected" as ConnectionState,
        metadata: options.metadata,
        controller: null,
        encoder,
      };

      // Store connection immediately (before stream starts)
      this.storeConnection(connection);

      // Create the stream
      const stream = new ReadableStream<Uint8Array>({
        start: (controller) => {
          // Update connection with controller
          connection.controller = controller;

          // Send welcome message
          this.sendWelcomeMessage(connection);

          console.log(`Connection ${clientId} fully established`);
        },
        cancel: () => {
          // Handle stream cancellation
          this.removeConnection(clientId, "stream_cancelled");
        },
      });

      return {
        success: true,
        data: { clientId, stream },
      };
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          "CONNECTION_FAILED" as SSEErrorCode,
          "Failed to create connection",
          error,
        ),
      };
    }
  }

  /**
   * Remove a connection
   */
  removeConnection(clientId: ClientId, reason = "unknown"): Result<void> {
    const connection = this.connections.get(clientId);

    if (!connection) {
      return {
        success: false,
        error: new SSEErrorClass(
          "CLIENT_NOT_FOUND" as SSEErrorCode,
          `Connection ${clientId} not found`,
        ),
      };
    }

    try {
      // Update state
      connection.state = "disconnected";

      // Close the stream - check if it's not already closed
      try {
        // desiredSize is null when the stream is closed or errored
        if (connection.controller?.desiredSize !== null) {
          connection.controller?.close();
        }
      } catch (error) {
        // Stream might already be closed, this is expected in some cases
        // Only log as debug since this is not an error condition
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Controller is already closed")) {
          console.debug(`Stream close handled for ${clientId}:`, errorMessage);
        }
      }

      // Remove from main map
      this.connections.delete(clientId);

      // Remove from user index
      if (connection.userId) {
        const userConnections = this.userIndex.get(connection.userId);
        if (userConnections) {
          userConnections.delete(clientId);
          if (userConnections.size === 0) {
            this.userIndex.delete(connection.userId);
          }
        }
      }

      // Remove from session index
      if (connection.sessionId) {
        const sessionConnections = this.sessionIndex.get(connection.sessionId);
        if (sessionConnections) {
          sessionConnections.delete(clientId);
          if (sessionConnections.size === 0) {
            this.sessionIndex.delete(connection.sessionId);
          }
        }
      }

      console.info(`Connection ${clientId} removed. Reason: ${reason}`);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          "INTERNAL_ERROR" as SSEErrorCode,
          "Failed to remove connection",
          error,
        ),
      };
    }
  }

  /**
   * Get a specific connection
   */
  getConnection(clientId: ClientId): Connection | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Get all connections for a user
   */
  getConnectionsByUser(userId: UserId): Connection[] {
    const clientIds = this.userIndex.get(userId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.connections.get(id))
      .filter((conn): conn is Connection => conn !== undefined);
  }

  /**
   * Get all connections for a session
   */
  getConnectionsBySession(sessionId: SessionId): Connection[] {
    const clientIds = this.sessionIndex.get(sessionId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.connections.get(id))
      .filter((conn): conn is Connection => conn !== undefined);
  }

  /**
   * Get all connections
   */
  getAllConnections(): Map<ClientId, Connection> {
    return new Map(this.connections);
  }

  /**
   * Check if connection exists
   */
  hasConnection(clientId: ClientId): boolean {
    return this.connections.has(clientId);
  }

  /**
   * Update connection state
   */
  updateConnectionState(
    clientId: ClientId,
    state: ConnectionState,
  ): Result<void> {
    const connection = this.connections.get(clientId);

    if (!connection) {
      return {
        success: false,
        error: new SSEErrorClass(
          "CLIENT_NOT_FOUND" as SSEErrorCode,
          `Connection ${clientId} not found`,
        ),
      };
    }

    connection.state = state;
    return { success: true, data: undefined };
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(clientId: ClientId): Result<void> {
    const connection = this.connections.get(clientId);

    if (!connection) {
      return {
        success: false,
        error: new SSEErrorClass(
          "CLIENT_NOT_FOUND" as SSEErrorCode,
          `Connection ${clientId} not found`,
        ),
      };
    }

    connection.lastActivity = new Date();
    return { success: true, data: undefined };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(timeout: number): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, connection] of this.connections) {
      const lastActivityTime = connection.lastActivity.getTime();

      if (now - lastActivityTime > timeout) {
        const result = this.removeConnection(clientId, "timeout");
        if (result.success) {
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get unique user count
   */
  getUserCount(): number {
    return this.userIndex.size;
  }

  /**
   * Get unique session count
   */
  getSessionCount(): number {
    return this.sessionIndex.size;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): ClientId {
    const timestamp = Date.now();
    const counter = ++this.connectionCounter;
    const random = Math.random().toString(36).substring(2, 9);
    return `sse_${timestamp}_${counter}_${random}`;
  }

  /**
   * Store connection with indexing
   */
  private storeConnection(connection: Connection): void {
    // Store in main map
    this.connections.set(connection.id, connection);

    // Index by user
    if (connection.userId) {
      if (!this.userIndex.has(connection.userId)) {
        this.userIndex.set(connection.userId, new Set());
      }
      this.userIndex.get(connection.userId)!.add(connection.id);
    }

    // Index by session
    if (connection.sessionId) {
      if (!this.sessionIndex.has(connection.sessionId)) {
        this.sessionIndex.set(connection.sessionId, new Set());
      }
      this.sessionIndex.get(connection.sessionId)!.add(connection.id);
    }

    console.log(`Connection stored: ${connection.id}`, {
      userId: connection.userId,
      sessionId: connection.sessionId,
      totalConnections: this.connections.size,
      userConnections: connection.userId
        ? this.userIndex.get(connection.userId)?.size
        : 0,
    });
  }

  /**
   * Send welcome message to new connection
   */
  private sendWelcomeMessage(connection: Connection): void {
    // Check if controller is available
    if (!connection.controller) {
      console.warn(
        `Controller not ready for welcome message to ${connection.id}`,
      );
      return;
    }

    const welcomeEvent = {
      type: "system:connection:established",
      data: {
        clientId: connection.id,
        connectedAt: connection.connectedAt.toISOString(),
        message: "Connected to SSE service",
        userId: connection.userId,
        sessionId: connection.sessionId,
      },
    };

    const message = this.formatSSEMessage(welcomeEvent);

    try {
      connection.controller.enqueue(connection.encoder.encode(message));
      console.log(`Welcome message sent to ${connection.id}`);
    } catch (error) {
      console.error(
        `Failed to send welcome message to ${connection.id}:`,
        error,
      );
    }
  }

  /**
   * Format event as SSE message
   */
  private formatSSEMessage(event: { type: string; data: unknown }): string {
    const lines: string[] = [];

    lines.push(`event: ${event.type}`);
    lines.push(`data: ${JSON.stringify(event.data)}`);

    return lines.join("\n") + "\n\n";
  }
}
