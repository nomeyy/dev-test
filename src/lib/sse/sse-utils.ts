import { sseManager } from "./sse-manager";
import { SSEEventEnum, type NotificationEventData } from "./types";

export function sendToClient(
  clientId: string,
  event: SSEEventEnum,
  data: unknown,
): boolean {
  return sseManager.sendEventToClient(clientId, {
    event: event,
    data,
  });
}

export function sendToUser(
  userId: string,
  event: SSEEventEnum,
  data: unknown,
): number {
  return sseManager.sendEventToUser(userId, {
    event: event,
    data,
  });
}
export function broadcast(event: SSEEventEnum, data: unknown): number {
  return sseManager.broadcastEvent({
    event: event,
    data,
  });
}

export function sendNotification(
  userId: string,
  message: string,
  options: Omit<NotificationEventData, "message"> = {},
): number {
  return sendToUser(userId, SSEEventEnum.notification, {
    message,
    timestamp: Date.now(),
    ...options,
  });
}

export function broadcastNotification(
  message: string,
  options: Omit<NotificationEventData, "message"> = {},
): number {
  return broadcast(SSEEventEnum.notification, {
    message,
    timestamp: Date.now(),
    ...options,
  });
}

export function getClientCount(): number {
  return sseManager.getClientCount();
}

export function getUserCount(): number {
  return sseManager.getUserCount();
}
