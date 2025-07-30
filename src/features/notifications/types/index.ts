export enum NotificationType {
  Ping = "Ping",
  NewSub = "NewSub",
  Unsub = "Unsub",
}

interface Notification {
  type: NotificationType;
}

export interface PingNotification extends Notification {
  type: NotificationType.Ping;
  message?: string;
}

export interface NewSubNotification extends Notification {
  type: NotificationType.NewSub;
  subId: string;
}

export interface UnsubNotification extends Notification {
  type: NotificationType.Unsub;
  subId: string;
}

export type NotificationEvent =
  | PingNotification
  | NewSubNotification
  | UnsubNotification;
