export enum NotificationType {
  Ping = "ping",
  NewSub = "newSub", 
  Unsub = "unsub",
  Connected = "connected",
  Heartbeat = "heartbeat",
  Mock = "mock",
}

interface BaseNotification {
  type: NotificationType;
  timestamp?: number;
}

export interface PingNotification extends BaseNotification {
  type: NotificationType.Ping;
  message?: string;
  targetId?: string;
}

export interface NewSubNotification extends BaseNotification {
  type: NotificationType.NewSub;
  subId: string;
}

export interface UnsubNotification extends BaseNotification {
  type: NotificationType.Unsub;
  subId: string;
}

export interface ConnectedNotification extends BaseNotification {
  type: NotificationType.Connected;
  id: string;
}

export interface HeartbeatNotification extends BaseNotification {
  type: NotificationType.Heartbeat;
  ts: number;
}

export interface MockNotification extends BaseNotification {
  type: NotificationType.Mock;
  text: string;
  targetId?: string;
}

export type NotificationEvent =
  | PingNotification
  | NewSubNotification
  | UnsubNotification
  | ConnectedNotification
  | HeartbeatNotification
  | MockNotification;

export interface SSEEvent {
  event: string;
  data: unknown;
}

export type SSESendFn = (event: string, data: unknown) => void;

export interface SSEClient {
  id: string;
  send: SSESendFn;
}

export interface NotificationEvents {
  notify: [subIds: string[], payload: NotificationEvent];
}

export type TargetSelector = (clientIds: string[]) => string[];

export interface SSEModule {
  connect: (clientId: string) => void;
  disconnect: (clientId: string) => void;
}