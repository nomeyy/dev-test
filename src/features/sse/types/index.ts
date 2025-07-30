export interface SSEConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  connected: boolean;
}

export interface SSEEvent {
  type: string;
  data: Record<string, any>;
  id?: string;
  retry?: number;
}

export interface SSEMessage {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface SSEManagerConfig {
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConnections: number;
}

export interface SSEClientOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type SSEEventHandler = (event: SSEEvent) => void;
export type SSEErrorHandler = (error: Error) => void;
export type SSEConnectionHandler = () => void;
