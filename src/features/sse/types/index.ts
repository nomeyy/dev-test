/**
 * Server-Sent Events Types
 * ------------------------
 * Type definitions for the SSE feature including events, connections, and payloads
 */

/**
 * Base SSE event structure
 */
export interface SSEEvent<T = unknown> {
  /** Event type identifier */
  type: string;
  /** Event payload data */
  data: T;
  /** Optional event ID for tracking */
  id?: string;
  /** Optional retry delay in milliseconds */
  retry?: number;
}

/**
 * SSE connection information
 */
export interface SSEConnection {
  /** Unique connection ID */
  id: string;
  /** User ID if authenticated */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Response stream */
  response: ReadableStreamDefaultController<Uint8Array>;
}

/**
 * SSE manager configuration
 */
export interface SSEManagerConfig {
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Maximum number of connections per user */
  maxConnectionsPerUser?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Client connection options
 */
export interface SSEClientOptions {
  /** Automatic reconnection */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Custom headers for SSE request */
  headers?: Record<string, string>;
}

/**
 * Predefined event types for common scenarios
 */
export const SSEEventTypes = {
  // System events
  PING: "ping",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",

  // User events
  NOTIFICATION: "notification",
  MESSAGE: "message",
  UPDATE: "update",

  // Custom events
  CUSTOM: "custom",
} as const;

export type SSEEventType = (typeof SSEEventTypes)[keyof typeof SSEEventTypes];

/**
 * Common event payloads
 */
export interface NotificationPayload {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp?: string;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

export interface MessagePayload {
  from: string;
  content: string;
  timestamp: string;
  type?: "text" | "system";
}

export interface UpdatePayload {
  resource: string;
  action: "created" | "updated" | "deleted";
  data: unknown;
  timestamp: string;
}

/**
 * Event filter options for targeted messaging
 */
export interface EventFilter {
  /** Target specific user IDs */
  userIds?: string[];
  /** Target specific session IDs */
  sessionIds?: string[];
  /** Target specific connection IDs */
  connectionIds?: string[];
  /** Exclude specific user IDs */
  excludeUserIds?: string[];
  /** Exclude specific session IDs */
  excludeSessionIds?: string[];
  /** Exclude specific connection IDs */
  excludeConnectionIds?: string[];
}

/**
 * SSE service interface for backend integration
 */
export interface SSEService {
  /** Send event to specific targets */
  sendEvent<T>(event: SSEEvent<T>, filter?: EventFilter): Promise<number>;
  /** Broadcast event to all connected clients */
  broadcast<T>(event: SSEEvent<T>): Promise<number>;
  /** Get active connection count */
  getConnectionCount(): number;
  /** Get connections for a specific user */
  getUserConnections(userId: string): SSEConnection[];
  /** Close specific connection */
  closeConnection(connectionId: string): boolean;
  /** Close all connections for a user */
  closeUserConnections(userId: string): number;
}
