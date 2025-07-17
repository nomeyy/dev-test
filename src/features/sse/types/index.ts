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
  connection: ReadableStreamDefaultController;
  lastHeartbeat: number;
  isAlive: boolean;
}

export interface SSEMessage {
  event: string;
  data: Record<string, unknown>;
  target?: "all" | "user" | "session" | "client";
  targetId?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

export interface SSEManagerStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByUser: Record<string, number>;
  connectionsBySession: Record<string, number>;
}
