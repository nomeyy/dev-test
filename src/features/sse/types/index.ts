export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  response: Response;
  controller: ReadableStreamDefaultController<string>;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export interface SSEMessage {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
}

export interface SSEEventPayload {
  event: string;
  data: any;
  targetUserId?: string;
  targetSessionId?: string;
  targetClientId?: string;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number; // milliseconds
  clientTimeout?: number; // milliseconds
  maxConnections?: number;
  enableLogging?: boolean;
}

export interface SSEConnectionInfo {
  clientId: string;
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export interface SSEStats {
  totalConnections: number;
  connectionsByUser: Record<string, number>;
  connectionsBySession: Record<string, number>;
}

// Client-side types
export interface SSEClientOptions {
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatTimeout?: number;
}

export interface SSEEventHandler {
  [eventName: string]: (data: any) => void;
}

export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
