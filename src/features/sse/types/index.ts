export interface SSEEvent {
  id?: string;
  event: string;
  data: unknown;
  retry?: number;
}

export interface SSEClient {
  id: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  isConnected: boolean;
}

export interface SSEMessagePayload {
  clientId?: string;
  target: 'all' | 'user'
  message: string;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number;
  cleanupInterval?: number;
}
