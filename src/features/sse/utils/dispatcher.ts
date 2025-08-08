import { getSSEManager } from "../services/sse-manager";
import type { SSEEvent, SSEMessage } from "../types";

/**
 * Send an SSE event to specific clients or broadcast
 */
export function sendSSEEvent(event: SSEEvent): number {
  const manager = getSSEManager();
  return manager.dispatch(event);
}

/**
 * Send a notification to a specific user
 */
export function sendNotificationToUser(
  userId: string,
  type: string,
  payload: unknown,
): number {
  const manager = getSSEManager();
  const message: SSEMessage = {
    event: type,
    data: payload as string | Record<string, unknown>,
  };
  return manager.sendToUser(userId, message);
}

/**
 * Broadcast a notification to all connected clients
 */
export function broadcastNotification(type: string, payload: unknown): number {
  const manager = getSSEManager();
  const message: SSEMessage = {
    event: type,
    data: payload as string | Record<string, unknown>,
  };
  return manager.broadcast(message);
}

/**
 * Send a notification to specific clients
 */
export function sendNotificationToClients(
  clientIds: string[],
  type: string,
  payload: unknown,
): number {
  const manager = getSSEManager();
  let sent = 0;

  const message: SSEMessage = {
    event: type,
    data: payload as string | Record<string, unknown>,
  };

  for (const clientId of clientIds) {
    if (manager.sendToClient(clientId, message)) {
      sent++;
    }
  }

  return sent;
}

/**
 * Utility to send different types of notifications
 */
export const SSENotifications = {
  // System notifications
  systemUpdate: (message: string, targets?: string[]) => {
    return sendSSEEvent({
      type: "system.update",
      payload: { message, timestamp: new Date().toISOString() },
      targets,
    });
  },

  systemMaintenance: (message: string, scheduledAt: Date) => {
    return broadcastNotification("system.maintenance", {
      message,
      scheduledAt: scheduledAt.toISOString(),
      timestamp: new Date().toISOString(),
    });
  },

  // User notifications
  userMessage: (userId: string, message: string, metadata?: unknown) => {
    return sendNotificationToUser(userId, "user.message", {
      message,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },

  userStatusUpdate: (userId: string, status: string) => {
    return sendNotificationToUser(userId, "user.status", {
      status,
      timestamp: new Date().toISOString(),
    });
  },

  // Data updates
  dataCreated: (
    resourceType: string,
    resourceId: string,
    data: unknown,
    targets?: string[],
  ) => {
    return sendSSEEvent({
      type: `data.${resourceType}.created`,
      payload: { resourceId, data, timestamp: new Date().toISOString() },
      targets,
    });
  },

  dataUpdated: (
    resourceType: string,
    resourceId: string,
    changes: unknown,
    targets?: string[],
  ) => {
    return sendSSEEvent({
      type: `data.${resourceType}.updated`,
      payload: { resourceId, changes, timestamp: new Date().toISOString() },
      targets,
    });
  },

  dataDeleted: (
    resourceType: string,
    resourceId: string,
    targets?: string[],
  ) => {
    return sendSSEEvent({
      type: `data.${resourceType}.deleted`,
      payload: { resourceId, timestamp: new Date().toISOString() },
      targets,
    });
  },

  // Custom event
  custom: (type: string, payload: unknown, targets?: string[]) => {
    return sendSSEEvent({ type, payload, targets });
  },
};
