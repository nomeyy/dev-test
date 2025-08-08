/**
 * Event Dispatcher
 *
 * Handles event routing, formatting, and delivery to SSE connections
 */

import type {
  SSEEvent,
  ClientId,
  UserId,
  SessionId,
  DispatchResult,
  Result,
  SendParams,
  Connection,
} from "../types";
import { SSEError as SSEErrorClass, SSEErrorCode as ErrorCode } from "../types";
import type { IConnectionManager } from "./connection-manager";

export interface IEventDispatcher {
  // Sending methods
  sendToClient<T>(
    clientId: ClientId,
    event: SSEEvent<T>,
  ): Result<DispatchResult>;
  sendToUser<T>(userId: UserId, event: SSEEvent<T>): Result<DispatchResult>;
  sendToSession<T>(
    sessionId: SessionId,
    event: SSEEvent<T>,
  ): Result<DispatchResult>;
  broadcast<T>(event: SSEEvent<T>): Result<DispatchResult>;
  multicast<T>(
    clientIds: ClientId[],
    event: SSEEvent<T>,
  ): Result<DispatchResult>;

  // Generic send method
  send<T>(params: SendParams<T>): Result<DispatchResult>;

  // Event formatting
  formatSSEMessage(event: SSEEvent): string;
}

export class EventDispatcher implements IEventDispatcher {
  private eventCounter = 0;

  constructor(private readonly connectionManager: IConnectionManager) {}

  /**
   * Send event to a specific client
   */
  sendToClient<T>(
    clientId: ClientId,
    event: SSEEvent<T>,
  ): Result<DispatchResult> {
    try {
      const connection = this.connectionManager.getConnection(clientId);

      if (!connection) {
        return {
          success: false,
          error: new SSEErrorClass(
            ErrorCode.CLIENT_NOT_FOUND,
            `Client ${clientId} not found`,
          ),
        };
      }

      const success = this.sendEventToConnection(connection, event);

      return {
        success: true,
        data: {
          success,
          sentCount: success ? 1 : 0,
          failedCount: success ? 0 : 1,
          errors: success
            ? undefined
            : [`Failed to send to client ${clientId}`],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          ErrorCode.SEND_FAILED,
          "Failed to send event to client",
          error,
        ),
      };
    }
  }

  /**
   * Send event to all connections of a user
   */
  sendToUser<T>(userId: UserId, event: SSEEvent<T>): Result<DispatchResult> {
    try {
      const connections = this.connectionManager.getConnectionsByUser(userId);

      if (connections.length === 0) {
        return {
          success: true,
          data: {
            success: true,
            sentCount: 0,
            failedCount: 0,
            errors: [`No connections found for user ${userId}`],
          },
        };
      }

      return this.sendToMultipleConnections(connections, event);
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          ErrorCode.SEND_FAILED,
          "Failed to send event to user",
          error,
        ),
      };
    }
  }

  /**
   * Send event to all connections in a session
   */
  sendToSession<T>(
    sessionId: SessionId,
    event: SSEEvent<T>,
  ): Result<DispatchResult> {
    try {
      const connections =
        this.connectionManager.getConnectionsBySession(sessionId);

      if (connections.length === 0) {
        return {
          success: true,
          data: {
            success: true,
            sentCount: 0,
            failedCount: 0,
            errors: [`No connections found for session ${sessionId}`],
          },
        };
      }

      return this.sendToMultipleConnections(connections, event);
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          ErrorCode.SEND_FAILED,
          "Failed to send event to session",
          error,
        ),
      };
    }
  }

  /**
   * Broadcast event to all connections
   */
  broadcast<T>(event: SSEEvent<T>): Result<DispatchResult> {
    try {
      const allConnections = this.connectionManager.getAllConnections();
      const connections = Array.from(allConnections.values());

      if (connections.length === 0) {
        return {
          success: true,
          data: {
            success: true,
            sentCount: 0,
            failedCount: 0,
            errors: ["No active connections"],
          },
        };
      }

      return this.sendToMultipleConnections(connections, event);
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          ErrorCode.SEND_FAILED,
          "Failed to broadcast event",
          error,
        ),
      };
    }
  }

  /**
   * Send event to multiple specific clients
   */
  multicast<T>(
    clientIds: ClientId[],
    event: SSEEvent<T>,
  ): Result<DispatchResult> {
    try {
      const connections: Connection[] = [];
      const notFound: string[] = [];

      for (const clientId of clientIds) {
        const connection = this.connectionManager.getConnection(clientId);
        if (connection) {
          connections.push(connection);
        } else {
          notFound.push(clientId);
        }
      }

      const result = this.sendToMultipleConnections(connections, event);

      if (result.success && notFound.length > 0) {
        result.data.errors = [
          ...(result.data.errors ?? []),
          `Clients not found: ${notFound.join(", ")}`,
        ];
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: new SSEErrorClass(
          ErrorCode.SEND_FAILED,
          "Failed to multicast event",
          error,
        ),
      };
    }
  }

  /**
   * Generic send method that routes based on target
   */
  send<T>(params: SendParams<T>): Result<DispatchResult> {
    const { target, targetId, event } = params;

    switch (target) {
      case "client":
        if (!targetId) {
          return {
            success: false,
            error: new SSEErrorClass(
              ErrorCode.VALIDATION_ERROR,
              "Target ID required for client target",
            ),
          };
        }
        return this.sendToClient(targetId, event);

      case "user":
        if (!targetId) {
          return {
            success: false,
            error: new SSEErrorClass(
              ErrorCode.VALIDATION_ERROR,
              "Target ID required for user target",
            ),
          };
        }
        return this.sendToUser(targetId, event);

      case "session":
        if (!targetId) {
          return {
            success: false,
            error: new SSEErrorClass(
              ErrorCode.VALIDATION_ERROR,
              "Target ID required for session target",
            ),
          };
        }
        return this.sendToSession(targetId, event);

      case "broadcast":
      case "all":
        return this.broadcast(event);

      default:
        return {
          success: false,
          error: new SSEErrorClass(
            ErrorCode.VALIDATION_ERROR,
            `Invalid target: ${target as string}`,
          ),
        };
    }
  }

  /**
   * Format an event as SSE message
   */
  formatSSEMessage(event: SSEEvent): string {
    const lines: string[] = [];

    // Add event ID if provided
    if (event.id) {
      lines.push(`id: ${event.id}`);
    } else {
      // Generate ID if not provided
      const id = this.generateEventId();
      lines.push(`id: ${id}`);
    }

    // Add retry if provided
    if (event.retry) {
      lines.push(`retry: ${event.retry}`);
    }

    // Add event type
    lines.push(`event: ${event.type}`);

    // Add timestamp if not provided
    const data =
      typeof event.data === "object" && event.data !== null
        ? {
            ...(event.data as Record<string, unknown>),
            timestamp: event.timestamp ?? Date.now(),
          }
        : { value: event.data, timestamp: event.timestamp ?? Date.now() };

    // Add data (can be multiple lines)
    const dataString = JSON.stringify(data);
    lines.push(`data: ${dataString}`);

    // SSE format requires double newline at the end
    return lines.join("\n") + "\n\n";
  }

  /**
   * Send event to multiple connections
   */
  private sendToMultipleConnections<T>(
    connections: Connection[],
    event: SSEEvent<T>,
  ): Result<DispatchResult> {
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const connection of connections) {
      const success = this.sendEventToConnection(connection, event);
      if (success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`Failed to send to client ${connection.id}`);
      }
    }

    return {
      success: true,
      data: {
        success: failedCount === 0,
        sentCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  /**
   * Send event to a single connection
   */
  private sendEventToConnection<T>(
    connection: Connection,
    event: SSEEvent<T>,
  ): boolean {
    try {
      // Check if connection is still active
      if (connection.state !== "connected") {
        console.warn(`Connection ${connection.id} is not in connected state`);
        return false;
      }

      // Check if controller is available (might not be set yet if stream hasn't started)
      if (!connection.controller) {
        console.warn(`Controller not yet available for ${connection.id}`);
        return false;
      }

      // Format the message
      const message = this.formatSSEMessage(event);

      // Encode and send
      const encoded = connection.encoder.encode(message);

      // Check if the stream is still writable
      if (connection.controller.desiredSize === null) {
        console.warn(`Stream for ${connection.id} is not writable`);
        return false;
      }

      // Enqueue the message
      connection.controller.enqueue(encoded);

      // Update last activity
      this.connectionManager.updateLastActivity(connection.id);

      return true;
    } catch (error) {
      console.error(`Failed to send event to ${connection.id}:`, error);
      return false;
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const counter = ++this.eventCounter;
    return `evt_${timestamp}_${counter}`;
  }
}
