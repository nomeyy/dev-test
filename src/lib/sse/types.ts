export interface SSEConnection {
  id: string;
  userId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface SSEEvent {
  id?: string;
  type: string;
  name?: string; // Named event identifier
  data: string | Record<string, unknown>;
  timestamp?: Date;
}

export interface SSEConnectionOptions {
  userId?: string;
}

export interface SSEBroadcastOptions {
  userIds?: string[];
  excludeConnectionIds?: string[];
  eventName?: string; // Filter by event name
}

export interface SSEDirectMessageOptions {
  connectionIds: string[];
  eventName?: string;
}

export interface SSEEventFilter {
  eventNames?: string[];
  userIds?: string[];
  connectionIds?: string[];
  excludeConnectionIds?: string[];
}

export interface SSEStats {
  totalConnections: number;
  activeConnections: number;
  eventsSent: number;
  eventsByType: Record<string, number>;
}

export interface SSEUserStats {
  userId: string;
  activeConnections: number;
  lastConnectionAt?: Date;
}

// Predefined event types for common use cases
export const SSE_EVENT_TYPES = {
  // System events
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  HEARTBEAT: "heartbeat",
  ERROR: "error",

  // User events
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  USER_STATUS_CHANGE: "user_status_change",

  // Notification events
  NOTIFICATION: "notification",
  ALERT: "alert",
  UPDATE: "update",

  // Custom events
  CUSTOM: "custom",
} as const;

export type SSEEventType =
  (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES];
