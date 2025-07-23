// Types for SSE events and client management
export interface SSEEvent {
  id?: string;
  event?: string;
  data: unknown;
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastPing: Date;
  metadata?: Record<string, unknown>;
}

export interface SSESubscription {
  clientId: string;
  topics?: string[];
  filters?: Record<string, unknown>;
}

export interface SSEBroadcastOptions {
  topics?: string[];
  userIds?: string[];
  clientIds?: string[];
  excludeClientIds?: string[];
}

export interface SSEManagerConfig {
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxConnections?: number;
  enableLogging?: boolean;
}

export interface SSEService {
  addClient(client: SSEClient): Promise<void>;
  removeClient(clientId: string): Promise<void>;
  getClient(clientId: string): Promise<SSEClient | null>;
  sendToClient(clientId: string, event: SSEEvent): Promise<boolean>;
  broadcast(event: SSEEvent, options?: SSEBroadcastOptions): Promise<number>;
  getActiveClients(): Promise<SSEClient[]>;
  cleanup(): Promise<void>;
}
