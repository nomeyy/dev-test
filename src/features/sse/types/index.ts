export interface SSEConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  lastPing: number;
  isActive: boolean;
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  id?: string;
  retry?: number;
}

export interface SSEManagerConfig {
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConnections: number;
}

export interface SendEventOptions {
  connectionId?: string;
  userId?: string;
  sessionId?: string;
  broadcast?: boolean;
}
