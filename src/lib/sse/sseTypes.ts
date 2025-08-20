export type SSEEventName = string;

export interface SSEPayload {
  [key: string]: unknown;
}

export interface SSEMessage<T = SSEPayload> {
  id?: string;
  event?: SSEEventName;
  data: T;
  retry?: number;
}
