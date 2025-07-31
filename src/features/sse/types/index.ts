/**
 * Core types for the Server-Sent Events (SSE) system
 */

/**
 * SSE Event data structure
 */
export interface SSEEvent {
  /** Event name/type */
  event: string;
  /** Event payload data */
  data: unknown;
  /** Optional event ID for client tracking */
  id?: string;
  /** Optional retry delay in milliseconds */
  retry?: number;
}

/**
 * SSE Client connection information
 */
export interface SSEClient {
  /** Unique client ID */
  id: string;
  /** User ID if authenticated */
  userId?: string;
  /** Response stream for sending events */
  response: Response;
  /** Readable stream controller */
  controller: ReadableStreamDefaultController<string>;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Client metadata */
  metadata?: Record<string, unknown>;
}

/**
 * SSE Connection options
 */
export interface SSEConnectionOptions {
  /** User ID for authenticated connections */
  userId?: string;
  /** Additional metadata for the connection */
  metadata?: Record<string, unknown>;
  /** Custom heartbeat interval in milliseconds */
  heartbeatInterval?: number;
}

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  /** Default heartbeat interval in milliseconds */
  defaultHeartbeatInterval: number;
  /** Maximum number of connections per user */
  maxConnectionsPerUser: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Enable debug logging */
  enableDebugLogging: boolean;
}

/**
 * Event broadcasting options
 */
export interface BroadcastOptions {
  /** Target specific user IDs */
  userIds?: string[];
  /** Target specific client IDs */
  clientIds?: string[];
  /** Exclude specific client IDs */
  excludeClientIds?: string[];
  /** Filter function for custom targeting */
  filter?: (client: SSEClient) => boolean;
}

/**
 * SSE Connection status
 */
export enum SSEConnectionStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

/**
 * Built-in system events
 */
export enum SSESystemEvents {
  HEARTBEAT = "heartbeat",
  CONNECTION_ESTABLISHED = "connection_established",
  CONNECTION_CLOSED = "connection_closed",
  ERROR = "error",
}
