/**
 * SSE Types and Interfaces
 */

/**
 * Represents an SSE client connection
 */
export interface SSEClient {
  /** Unique client identifier */
  id: string;
  /** User ID associated with this client (if authenticated) */
  userId?: string;
  /** Session ID for this client */
  sessionId?: string;
  /** The Response object for this SSE connection */
  response: Response;
  /** The ReadableStreamDefaultController for sending events */
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** Timestamp when the client connected */
  connectedAt: Date;
  /** Last activity timestamp (for cleanup) */
  lastActivity: Date;
  /** Client metadata */
  metadata?: Record<string, unknown>;
}

/**
 * SSE Event data structure
 */
export interface SSEEvent {
  /** Event type/name */
  event: string;
  /** Event data payload */
  data: unknown;
  /** Optional event ID */
  id?: string;
  /** Optional retry timeout in milliseconds */
  retry?: number;
}

/**
 * SSE Connection options
 */
export interface SSEConnectionOptions {
  /** User ID for authenticated connections */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Custom heartbeat interval (default: 30000ms) */
  heartbeatInterval?: number;
}

/**
 * Event filter for targeting specific clients
 */
export interface SSEEventFilter {
  /** Target specific client IDs */
  clientIds?: string[];
  /** Target specific user IDs */
  userIds?: string[];
  /** Target specific session IDs */
  sessionIds?: string[];
  /** Custom filter function */
  customFilter?: (client: SSEClient) => boolean;
}

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Client cleanup interval in milliseconds (default: 60000) */
  cleanupInterval?: number;
  /** Maximum client idle time before cleanup in milliseconds (default: 300000) */
  maxIdleTime?: number;
  /** Maximum number of clients per user (default: 5) */
  maxClientsPerUser?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Event handler for SSE events
 */
export type SSEEventHandler = (event: SSEEvent, client: SSEClient) => void;

/**
 * Client lifecycle event types
 */
export type SSEClientLifecycleEvent = "connect" | "disconnect" | "error";

/**
 * Client lifecycle event handler
 */
export type SSEClientLifecycleHandler = (
  event: SSEClientLifecycleEvent,
  client: SSEClient,
  error?: Error,
) => void;
