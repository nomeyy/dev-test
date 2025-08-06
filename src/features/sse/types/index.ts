export interface SSEEvent {
  id?: string;
  event: string;
  data: Record<string, unknown>;
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastPing: Date;
}

export interface SSEMessage {
  event: string;
  data: Record<string, unknown>;
  target?: "all" | string | string[]; // 'all' for broadcast, string for specific client, array for multiple clients
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  timeout?: number;
}
