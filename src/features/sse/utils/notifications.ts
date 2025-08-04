import { SSEManager } from "../services/sse-manager";
import type { SSEEvent, ClientFilter, SSEManagerConfig } from "../types";

// Global SSE manager instance
let sseManager: SSEManager | null = null;

/**
 * Initialize the global SSE manager
 */
export function initializeSSE(config?: SSEManagerConfig): SSEManager {
  if (sseManager) {
    sseManager.destroy();
  }

  sseManager = new SSEManager(config);
  return sseManager;
}

/**
 * Get the global SSE manager instance
 */
export function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager();
  }
  return sseManager;
}

/**
 * Send a notification to a specific user
 */
export function notifyUser(userId: string, event: SSEEvent): number {
  return getSSEManager().sendToUser(userId, event);
}

/**
 * Send a notification to multiple users
 */
export function notifyUsers(userIds: string[], event: SSEEvent): number {
  let totalSent = 0;
  for (const userId of userIds) {
    totalSent += getSSEManager().sendToUser(userId, event);
  }
  return totalSent;
}

/**
 * Broadcast a notification to all connected clients
 */
export function broadcast(event: SSEEvent): number {
  return getSSEManager().broadcast(event);
}

/**
 * Send a notification to clients matching specific criteria
 */
export function notifyFiltered(filter: ClientFilter, event: SSEEvent): number {
  return getSSEManager().sendToClients(filter, event);
}

/**
 * Send a system notification (typically for maintenance, updates, etc.)
 */
export function systemNotification(
  message: string,
  level: "info" | "warning" | "error" = "info",
): number {
  return broadcast({
    event: "system",
    data: {
      level,
      message,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send a real-time update notification
 */
export function realtimeUpdate(
  type: string,
  data: unknown,
  targetUsers?: string[],
): number {
  const event: SSEEvent = {
    event: "update",
    data: {
      type,
      data,
      timestamp: new Date().toISOString(),
    },
  };

  if (targetUsers && targetUsers.length > 0) {
    return notifyUsers(targetUsers, event);
  }

  return broadcast(event);
}

/**
 * Send a progress update (useful for long-running operations)
 */
export function progressUpdate(
  operationId: string,
  progress: number,
  message?: string,
  userId?: string,
): number {
  const event: SSEEvent = {
    event: "progress",
    data: {
      operationId,
      progress: Math.min(100, Math.max(0, progress)), // Clamp between 0-100
      message,
      timestamp: new Date().toISOString(),
    },
  };

  if (userId) {
    return notifyUser(userId, event);
  }

  return broadcast(event);
}

/**
 * Send an error notification
 */
export function errorNotification(
  error: string,
  context?: Record<string, unknown>,
  userId?: string,
): number {
  const event: SSEEvent = {
    event: "error",
    data: {
      error,
      context,
      timestamp: new Date().toISOString(),
    },
  };

  if (userId) {
    return notifyUser(userId, event);
  }

  return broadcast(event);
}

/**
 * Send a success notification
 */
export function successNotification(
  message: string,
  data?: unknown,
  userId?: string,
): number {
  const event: SSEEvent = {
    event: "success",
    data: {
      message,
      data,
      timestamp: new Date().toISOString(),
    },
  };

  if (userId) {
    return notifyUser(userId, event);
  }

  return broadcast(event);
}

/**
 * Clean up the SSE manager on application shutdown
 */
export function cleanupSSE(): void {
  if (sseManager) {
    sseManager.destroy();
    sseManager = null;
  }
}
