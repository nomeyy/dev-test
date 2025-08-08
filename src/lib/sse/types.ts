export interface SSEEvent<T = unknown> {
  event: string;
  data: T;
  id?: string;
}

export interface SSEClient {
  id: string;
  userId?: string;
  response: Response;
  controller: ReadableStreamController<Uint8Array>;
}

export enum SSETypeEnum {
  system = "system",
  user = "user",
  broadcast = "broadcast",
}

export enum SSEEventEnum {
  connected = "connected",
  disconnected = "disconnected",
  heartbeat = "heartbeat",
  notification = "notification",
  error = "error",
  message = "message",
}

export interface ConnectedEventData {
  clientId: string;
  timestamp?: number;
}

export interface HeartbeatEventData {
  timestamp: number;
}

export interface NotificationEventData {
  message: string;
  timestamp?: number;
  title?: string;
  priority?: "low" | "medium" | "high";
  [key: string]: unknown;
}

export interface ErrorEventData {
  message: string;
  code?: string | number;
  timestamp?: number;
  [key: string]: unknown;
}

export interface SendEventRequest {
  type: SSETypeEnum;
  event: SSEEventEnum;
  data: unknown;
  userId?: string;
}

export interface SendEventResponse {
  success: boolean;
  sentCount: number;
  target: "user" | "broadcast";
  userId?: string;
  error?: string;
}
