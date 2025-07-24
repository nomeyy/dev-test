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
  response: Response;
  controller: ReadableStreamDefaultController;
  lastActivity: number;
  isConnected: boolean;
}

export enum EVENT_DESTINATION {
  ALL = "ALL",
  USER = "USER",
}

export interface SSEMessage {
  event: string;
  data: Record<string, unknown>;
  target?: EVENT_DESTINATION.ALL | EVENT_DESTINATION.USER | string[];
  exclude?: string[];
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  heartbeatInterval?: number;
  maxIdleTime?: number;
}

export interface SSEServiceType {
  addClient(client: SSEClient): void;
  removeClient(clientId: string): void;
  sendMessage(message: SSEMessage): Promise<void>;
  sendToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  sendToAll(
    event: string,
    data: Record<string, unknown>,
    exclude?: string[],
  ): Promise<void>;
  getActiveClients(): SSEClient[];
  getClientCount(): number;
  cleanup(): void;
}
