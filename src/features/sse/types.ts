import { z } from "zod";

export type SSEClientId = string;

export interface SSEClient {
  id: SSEClientId;
  userId?: string;
  send: (event: string, data: any) => Promise<void>;
  lastPing: number;
  metadata?: Record<string, unknown>;
}

export const SSEEventSchema = z.object({
  type: z.string(),
  data: z.unknown(),
  targetClientIds: z.array(z.string()).optional(),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

export interface SSEManagerInterface {
  addClient(client: SSEClient): void;
  removeClient(clientId: SSEClientId): void;
  sendEvent(event: SSEEvent): void;
  broadcast(type: string, data: unknown): void;
  sendToClient(clientId: SSEClientId, type: string, data: unknown): void;
  sendToClients(clientIds: SSEClientId[], type: string, data: unknown): void;
  cleanup(): void;
}

export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const CLIENT_TIMEOUT = 60000; // 60 seconds
