export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  connectedAt: number;
  lastPing: number;
  metadata?: Record<string, string>;
}

export interface SSEEvent<T = unknown> {
  event: string;
  data: T;
  id?: string;
  retry?: number;
}

export interface ClientFilter {
  userId?: string;
  sessionId?: string;
  clientIds?: string[];
  metadata?: Record<string, string>;
}

export interface SSEConfig {
  pingInterval?: number; // milliseconds
  clientTimeout?: number; // milliseconds
  maxClients?: number;
  enableLogging?: boolean;
}

export interface SSEStats {
  totalClients: number;
  clientsByUser: Record<string, number>;
  averageConnectionDuration: number;
  totalEventsSent: number;
  lastEventTime?: number;
}
