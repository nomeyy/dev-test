export type SseEventPayload = Record<string, unknown> | string | number | boolean | null;

export type ConnectionId = string;

export type ClientId = string;

export type UserId = string;

export interface SseConnection {
  connectionId: ConnectionId;
  clientId: ClientId;
  userId?: UserId;
  enqueue: (chunk: Uint8Array) => void;
  close: () => void;
  createdAt: number;
}

export interface SendOptions<T extends SseEventPayload = SseEventPayload> {
  event: string;
  data: T;
}

export interface EmitTarget {
  clientId?: ClientId;
  userId?: UserId;
} 