export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  response: Response;
  createdAt: Date;
  lastPing: Date;
  controller?: ReadableStreamDefaultController;
  isConnected: boolean;
  lastActivity: Date;
  errorCount: number;
}

export interface SSEEvent {
  event: string;
  data: any;
  id?: string;
  retry?: number;
}

export interface SSEManager {
  clients: Map<string, SSEClient>;
  addClient(client: SSEClient): void;
  removeClient(clientId: string): void;
  sendToClient(clientId: string, event: SSEEvent): Promise<boolean>;
  sendToUser(userId: string, event: SSEEvent): Promise<number>;
  broadcast(event: SSEEvent): Promise<number>;
  getClientCount(): number;
  getClientById(clientId: string): SSEClient | undefined;
  getClientsByUserId(userId: string): SSEClient[];
  cleanup(): void;
  isClientConnected(clientId: string): boolean;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  heartbeatInterval?: number;
}

export interface SSEConnectionResult {
  success: boolean;
  clientId?: string;
  error?: string;
}

export type SSEEventType =
  | "connect"
  | "disconnect"
  | "notification"
  | "system_update"
  | "ping"
  | "error"
  | "reconnect";
