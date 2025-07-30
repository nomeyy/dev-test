import { getSSEManager } from "../services/sse-manager";
import type { SSEMessage } from "../types";

/**
 * Send a message to all connected SSE clients
 */
export function broadcastSSE(event: string, data: any): void {
  const sseManager = getSSEManager();
  sseManager.broadcast(event, data);
}

/**
 * Send a message to a specific user (all their connections)
 */
export function sendSSEToUser(userId: string, event: string, data: any): void {
  const sseManager = getSSEManager();
  sseManager.sendToUser(userId, event, data);
}

/**
 * Send a message to a specific session
 */
export function sendSSEToSession(
  sessionId: string,
  event: string,
  data: any,
): void {
  const sseManager = getSSEManager();
  sseManager.sendToSession(sessionId, event, data);
}

/**
 * Send a message to a specific client
 */
export function sendSSEToClient(
  clientId: string,
  event: string,
  data: any,
): void {
  const sseManager = getSSEManager();
  sseManager.sendToClient(clientId, event, data);
}

/**
 * Send a custom SSE message with specific targeting
 */
export function sendSSEMessage(message: SSEMessage): void {
  const sseManager = getSSEManager();
  sseManager.sendMessage(message);
}

/**
 * Get the number of active SSE connections
 */
export function getSSEClientCount(): number {
  const sseManager = getSSEManager();
  return sseManager.getClientCount();
}

/**
 * Get all active SSE clients
 */
export function getSSEActiveClients() {
  const sseManager = getSSEManager();
  return sseManager.getActiveClients();
}

/**
 * Get the event history
 */
export function getSSEEventHistory() {
  const sseManager = getSSEManager();
  return sseManager.getEventHistory();
}

/**
 * Clear the event history
 */
export function clearSSEEventHistory() {
  const sseManager = getSSEManager();
  sseManager.clearEventHistory();
}

/**
 * Common SSE event types for consistency across the application
 */
export const SSE_EVENTS = {
  // Connection events
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  PING: "ping",

  // User events
  USER_UPDATED: "user_updated",
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",

  // Notification events
  NOTIFICATION: "notification",
  NOTIFICATION_READ: "notification_read",

  // Real-time updates
  DATA_UPDATED: "data_updated",
  DATA_CREATED: "data_created",
  DATA_DELETED: "data_deleted",

  // System events
  SYSTEM_MAINTENANCE: "system_maintenance",
  SYSTEM_ERROR: "system_error",
} as const;

/**
 * Helper function to create notification events
 */
export function createNotificationEvent(
  type: "info" | "success" | "warning" | "error",
  title: string,
  message: string,
  data?: any,
) {
  return {
    event: SSE_EVENTS.NOTIFICATION,
    data: {
      type,
      title,
      message,
      timestamp: Date.now(),
      ...data,
    },
  };
}

/**
 * Helper function to create data update events
 */
export function createDataUpdateEvent(
  resource: string,
  action: "created" | "updated" | "deleted",
  data: any,
) {
  const eventMap = {
    created: SSE_EVENTS.DATA_CREATED,
    updated: SSE_EVENTS.DATA_UPDATED,
    deleted: SSE_EVENTS.DATA_DELETED,
  };

  return {
    event: eventMap[action],
    data: {
      resource,
      action,
      data,
      timestamp: Date.now(),
    },
  };
}
