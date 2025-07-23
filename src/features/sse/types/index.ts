export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  headers: Headers;
  send: (data: string) => void;
  close: () => void;
  isConnected: boolean;
  lastActivity: number;
  metadata?: Record<string, any>;
}

export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  retry?: number;
  timestamp: number;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  heartbeatInterval?: number;
  maxReconnectTime?: number;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number;
  maxConnections?: number;
  connectionTimeout?: number;
  enableRedis?: boolean;
  redisChannel?: string;
}

export interface SSEMessage {
  type: "event" | "heartbeat" | "system";
  event?: string;
  data?: any;
  target?: "all" | "user" | "session" | "client";
  targetId?: string;
  timestamp: number;
}

export interface SSEClientStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByUser: Record<string, number>;
  lastActivity: number;
}

export type SSEEventType =
  | "notification"
  | "status_update"
  | "data_sync"
  | "system_alert"
  | "user_activity"
  | "custom";

export interface SSEError {
  code: string;
  message: string;
  timestamp: number;
  clientId?: string;
}
