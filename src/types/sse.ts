/**
 * Server-Sent Events types and interfaces
 */

/**
 * Represents an SSE event that can be sent to clients
 */
export interface SSEEvent {
  /** Event type identifier */
  type: string;
  /** Event data payload */
  data: unknown;
  /** Optional event ID for client tracking */
  id?: string;
  /** Optional retry delay in milliseconds */
  retry?: number;
}

/**
 * Represents a connected SSE client
 */
export interface SSEClient {
  /** Unique client identifier */
  id: string;
  /** User ID if authenticated */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Client's readable stream */
  controller: ReadableStreamDefaultController<string>;
  /** Connection metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for sending events to clients
 */
export interface SendEventOptions {
  /** Target specific user IDs */
  userIds?: string[];
  /** Target specific client IDs */
  clientIds?: string[];
  /** Target specific session IDs */
  sessionIds?: string[];
  /** Broadcast to all connected clients */
  broadcast?: boolean;
  /** Exclude specific client IDs from broadcast */
  excludeClientIds?: string[];
}

/**
 * SSE connection configuration
 */
export interface SSEConfig {
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
  /** Client timeout in milliseconds */
  clientTimeout: number;
  /** Maximum number of connections per user */
  maxConnectionsPerUser: number;
  /** Redis key prefix for storing connections */
  redisKeyPrefix: string;
}

/**
 * SSE service interface
 */
export interface SSEServiceInterface {
  /** Add a new client connection */
  addClient(client: SSEClient): Promise<void>;
  /** Remove a client connection */
  removeClient(clientId: string): Promise<void>;
  /** Send event to clients based on options */
  sendEvent(event: SSEEvent, options: SendEventOptions): Promise<void>;
  /** Get all connected clients */
  getClients(): Promise<SSEClient[]>;
  /** Get clients for a specific user */
  getClientsByUserId(userId: string): Promise<SSEClient[]>;
  /** Cleanup disconnected clients */
  cleanup(): Promise<void>;
}

/**
 * Built-in SSE event types
 */
export const SSE_EVENT_TYPES = {
  HEARTBEAT: "heartbeat",
  CONNECTION_ESTABLISHED: "connection_established",
  NOTIFICATION: "notification",
  VIDEO_UPLOAD_PROGRESS: "video_upload_progress",
  VIDEO_READY: "video_ready",
  SEARCH_UPDATE: "search_update",
  USER_UPDATE: "user_update",
} as const;

export type SSEEventType =
  (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES];
