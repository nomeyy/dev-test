/**
 * Backend Integration Utilities
 * -----------------------------
 * Helper functions for backend modules to easily send SSE events
 */

import { getSSEManager } from "../services/sse-manager";
import type {
  SSEEvent,
  EventFilter,
  NotificationPayload,
  MessagePayload,
  UpdatePayload,
  SSEEventTypes,
} from "../types";

/**
 * Send a notification to specific users or broadcast
 */
export async function sendNotification(
  notification: NotificationPayload,
  filter?: EventFilter,
): Promise<number> {
  const event: SSEEvent<NotificationPayload> = {
    type: "notification",
    data: {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    },
  };

  const sseManager = getSSEManager();
  return filter
    ? sseManager.sendEvent(event, filter)
    : sseManager.broadcast(event);
}

/**
 * Send a message to specific users or broadcast
 */
export async function sendMessage(
  message: MessagePayload,
  filter?: EventFilter,
): Promise<number> {
  const event: SSEEvent<MessagePayload> = {
    type: "message",
    data: message,
  };

  const sseManager = getSSEManager();
  return filter
    ? sseManager.sendEvent(event, filter)
    : sseManager.broadcast(event);
}

/**
 * Send an update event about a resource change
 */
export async function sendUpdate(
  update: UpdatePayload,
  filter?: EventFilter,
): Promise<number> {
  const event: SSEEvent<UpdatePayload> = {
    type: "update",
    data: {
      ...update,
      timestamp: update.timestamp || new Date().toISOString(),
    },
  };

  const sseManager = getSSEManager();
  return filter
    ? sseManager.sendEvent(event, filter)
    : sseManager.broadcast(event);
}

/**
 * Send a custom event with any payload
 */
export async function sendCustomEvent<T>(
  eventType: string,
  data: T,
  filter?: EventFilter,
  options?: { id?: string; retry?: number },
): Promise<number> {
  const event: SSEEvent<T> = {
    type: eventType,
    data,
    id: options?.id,
    retry: options?.retry,
  };

  const sseManager = getSSEManager();
  return filter
    ? sseManager.sendEvent(event, filter)
    : sseManager.broadcast(event);
}

/**
 * Send notification to specific user
 */
export async function notifyUser(
  userId: string,
  notification: NotificationPayload,
): Promise<number> {
  return sendNotification(notification, { userIds: [userId] });
}

/**
 * Send notification to multiple users
 */
export async function notifyUsers(
  userIds: string[],
  notification: NotificationPayload,
): Promise<number> {
  return sendNotification(notification, { userIds });
}

/**
 * Broadcast notification to all connected clients
 */
export async function broadcastNotification(
  notification: NotificationPayload,
): Promise<number> {
  return sendNotification(notification);
}

/**
 * Send message to specific user
 */
export async function messageUser(
  userId: string,
  message: MessagePayload,
): Promise<number> {
  return sendMessage(message, { userIds: [userId] });
}

/**
 * Broadcast message to all connected clients
 */
export async function broadcastMessage(
  message: MessagePayload,
): Promise<number> {
  return sendMessage(message);
}

/**
 * Notify about resource update to specific users
 */
export async function notifyUpdate(
  userIds: string[],
  update: UpdatePayload,
): Promise<number> {
  return sendUpdate(update, { userIds });
}

/**
 * Broadcast resource update to all clients
 */
export async function broadcastUpdate(update: UpdatePayload): Promise<number> {
  return sendUpdate(update);
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  getUserConnections: (userId: string) => number;
} {
  const sseManager = getSSEManager();

  return {
    totalConnections: sseManager.getConnectionCount(),
    getUserConnections: (userId: string) =>
      sseManager.getUserConnections(userId).length,
  };
}

/**
 * Disconnect specific user's connections
 */
export function disconnectUser(userId: string): number {
  const sseManager = getSSEManager();
  return sseManager.closeUserConnections(userId);
}

/**
 * Disconnect specific connection
 */
export function disconnectConnection(connectionId: string): boolean {
  const sseManager = getSSEManager();
  return sseManager.closeConnection(connectionId);
}

/**
 * Example usage functions for common scenarios
 */
export const SSEHelpers = {
  /**
   * Notify user about a successful action
   */
  async notifySuccess(
    userId: string,
    title: string,
    message: string,
  ): Promise<number> {
    return notifyUser(userId, {
      title,
      message,
      type: "success",
    });
  },

  /**
   * Notify user about an error
   */
  async notifyError(
    userId: string,
    title: string,
    message: string,
  ): Promise<number> {
    return notifyUser(userId, {
      title,
      message,
      type: "error",
    });
  },

  /**
   * Notify user about a warning
   */
  async notifyWarning(
    userId: string,
    title: string,
    message: string,
  ): Promise<number> {
    return notifyUser(userId, {
      title,
      message,
      type: "warning",
    });
  },

  /**
   * Send system message to all users
   */
  async systemBroadcast(message: string): Promise<number> {
    return broadcastMessage({
      from: "System",
      content: message,
      timestamp: new Date().toISOString(),
      type: "system",
    });
  },

  /**
   * Notify about new data available
   */
  async notifyDataUpdate(
    userIds: string[],
    resource: string,
    data: unknown,
  ): Promise<number> {
    return notifyUpdate(userIds, {
      resource,
      action: "updated",
      data,
      timestamp: new Date().toISOString(),
    });
  },
};
