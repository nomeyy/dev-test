export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  retry?: number;
  _key?: string; // Unique key for React components
}

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  abortController: AbortController;
  lastPing: number;
  isAlive: boolean;
}

export interface SSEMessage {
  event: string;
  data: any;
  target?: "all" | "user" | "session" | "client";
  targetId?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

export interface SSEManager {
  addClient(client: SSEClient): void;
  removeClient(clientId: string): void;
  sendMessage(message: SSEMessage): void;
  broadcast(event: string, data: any): void;
  sendToUser(userId: string, event: string, data: any): void;
  sendToSession(sessionId: string, event: string, data: any): void;
  sendToClient(clientId: string, event: string, data: any): void;
  getActiveClients(): SSEClient[];
  getClientCount(): number;
  getEventHistory(): Array<{ event: string; data: any; timestamp: number }>;
  clearEventHistory(): void;
}
