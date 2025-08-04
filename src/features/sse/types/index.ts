export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  response: Response;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastPing: number;
  connectedAt: number;
  metadata?: Record<string, unknown>;
}

export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface SSEManagerConfig {
  pingInterval?: number; // milliseconds
  clientTimeout?: number; // milliseconds
  maxClients?: number;
  enableLogging?: boolean;
}

export interface ClientFilter {
  userId?: string;
  sessionId?: string;
  clientIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface SSEStats {
  totalClients: number;
  clientsByUser: Record<string, number>;
  averageConnectionDuration: number;
  totalEventsSent: number;
  lastEventTime?: number;
}
