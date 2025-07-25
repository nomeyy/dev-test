/**
 * SSE Event structure for sending events to clients
 */
export interface SSEEvent {
  /** Event name/type identifier */
  event: string;
  /** JSON serializable data payload */
  data: Record<string, unknown>;
  /** Optional event ID for client-side deduplication */
  id?: string;
  /** Optional retry interval in milliseconds */
  retry?: number;
}

/**
 * SSE Connection information
 */
export interface SSEConnection {
  /** Unique connection ID */
  id: string;
  /** User ID if authenticated */
  userId?: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Request headers for context */
  headers: Record<string, string>;
  /** Readable stream controller */
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** Connection status */
  status: "connected" | "disconnected" | "error";
}

/**
 * Options for sending SSE events
 */
export interface SendEventOptions {
  /** Target specific user IDs */
  userIds?: string[];
  /** Target specific session IDs */
  sessionIds?: string[];
  /** Target specific connection IDs */
  connectionIds?: string[];
  /** If true, broadcast to all connections */
  broadcast?: boolean;
  /** Exclude specific connection IDs from broadcast */
  exclude?: string[];
}

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Maximum number of connections per user */
  maxConnectionsPerUser?: number;
  /** Enable detailed logging */
  enableLogging?: boolean;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  /** Total active connections */
  totalConnections: number;
  /** Connections by user */
  connectionsByUser: Record<string, number>;
  /** Connections by session */
  connectionsBySession: Record<string, number>;
  /** Average connection duration in milliseconds */
  averageConnectionDuration: number;
}

/**
 * SSE Backend integration interface
 */
export interface SSEBackend {
  /** Send event to specific targets */
  sendEvent(event: SSEEvent, options?: SendEventOptions): Promise<void>;
  /** Broadcast event to all connections */
  broadcast(event: SSEEvent, exclude?: string[]): Promise<void>;
  /** Get connection statistics */
  getStats(): ConnectionStats;
  /** Close specific connection */
  closeConnection(connectionId: string): Promise<void>;
  /** Close all connections for a user */
  closeUserConnections(userId: string): Promise<void>;
}
