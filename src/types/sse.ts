export type SSEClientId = string;

export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface SSEClient {
  id: SSEClientId;
  userId?: string;
  response: NodeJS.WritableStream;
  isAlive: boolean;
}
