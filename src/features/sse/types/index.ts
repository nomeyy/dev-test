export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface SSEMessage {
  id?: string;
  event?: string;
  data: string | Record<string, unknown>;
  retry?: number;
}

export interface SSEEvent {
  type: string;
  payload: unknown;
  targets?: string[]; // Client IDs or user IDs to send to
}

export interface SSEManagerOptions {
  heartbeatInterval?: number; // ms, default 30000
  clientTimeout?: number; // ms, default 120000
  maxClients?: number; // Maximum concurrent connections
  enableLogging?: boolean;
}

export type SSEEventHandler = (event: SSEEvent) => void | Promise<void>;

export interface SSEStats {
  activeConnections: number;
  totalConnections: number;
  messagesSent: number;
  errors: number;
}
