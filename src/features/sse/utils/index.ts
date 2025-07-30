import { sseManager } from "../services/sse-manager";
import type { SSEEvent } from "../types";

/**
 * Utility functions for backend modules to easily send SSE events
 */

/**
 * Send a notification to a specific user
 */
export function notifyUser(
  userId: string,
  type: string,
  data: Record<string, any>,
) {
  const event: SSEEvent = {
    type,
    data,
    id: `${Date.now()}-${Math.random()}`,
  };

  return sseManager.sendToUser(userId, event);
}

/**
 * Send a notification to all users in a session
 */
export function notifySession(
  sessionId: string,
  type: string,
  data: Record<string, any>,
) {
  const event: SSEEvent = {
    type,
    data,
    id: `${Date.now()}-${Math.random()}`,
  };

  return sseManager.sendToSession(sessionId, event);
}

/**
 * Broadcast a notification to all connected clients
 */
export function broadcastNotification(type: string, data: Record<string, any>) {
  const event: SSEEvent = {
    type,
    data,
    id: `${Date.now()}-${Math.random()}`,
  };

  return sseManager.broadcast(event);
}

/**
 * Send a system notification (maintenance, updates, etc.)
 */
export function sendSystemNotification(
  message: string,
  severity: "info" | "warning" | "error" = "info",
) {
  return broadcastNotification("system", {
    message,
    severity,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send a real-time update about a specific resource
 */
export function sendResourceUpdate(
  resourceType: string,
  resourceId: string,
  action: "created" | "updated" | "deleted",
  data?: Record<string, any>,
) {
  return broadcastNotification("resource_update", {
    resourceType,
    resourceId,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get current SSE connection statistics
 */
export function getSSEStats() {
  return sseManager.getStats();
}
