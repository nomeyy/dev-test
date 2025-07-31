export interface SSEEvent {
  id?: string;
  event: string;
  data: unknown;
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId: string | null;
  sessionId: string | null;
  send: (event: SSEEvent) => void;
  close: () => void;
}

export interface SSEManager {
  clients: Map<string, SSEClient>;
  addClient: (client: SSEClient) => void;
  removeClient: (clientId: string) => void;
  sendToClient: (clientId: string, event: SSEEvent) => void;
  sendToUser: (userId: string, event: SSEEvent) => void;
  broadcast: (event: SSEEvent) => void;
  getClientCount: () => number;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  onConnect?: (clientId: string) => void;
}
