export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  isConnected: boolean;
}

export interface SSEMessage {
  event: string;
  data: any;
  target?: "all" | "user" | "session" | "client";
  targetId?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number; // in milliseconds
  maxConnections?: number;
  cleanupInterval?: number; // in milliseconds
}
