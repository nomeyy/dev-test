import { sseManager } from "../services/sse-manager";
import type { SSEEvent, SendEventOptions } from "../types";
import { logger } from "@/utils/logging";

const log = logger.createContextLogger("SSE-Backend");

/**
 * High-level utility functions for backend services to send SSE events
 * Provides a clean, simple API for other modules to push real-time updates
 */

/**
 * Send a notification to specific users
 */
export async function notifyUsers(
  event: string,
  data: Record<string, unknown>,
  userIds: string[],
): Promise<void> {
  const sseEvent: SSEEvent = {
    event,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  };

  await sseManager.sendEvent(sseEvent, { userIds });
  log.info("Notification sent to users", {
    event,
    userIds,
    dataKeys: Object.keys(data),
  });
}

/**
 * Send a notification to specific sessions
 */
export async function notifySessions(
  event: string,
  data: Record<string, unknown>,
  sessionIds: string[],
): Promise<void> {
  const sseEvent: SSEEvent = {
    event,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  };

  await sseManager.sendEvent(sseEvent, { sessionIds });
  log.info("Notification sent to sessions", {
    event,
    sessionIds,
    dataKeys: Object.keys(data),
  });
}

/**
 * Broadcast notification to all connected clients
 */
export async function broadcastNotification(
  event: string,
  data: Record<string, unknown>,
  excludeUserIds?: string[],
): Promise<void> {
  const sseEvent: SSEEvent = {
    event,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  };

  // Get connection IDs to exclude if userIds provided
  let excludeConnections: string[] = [];
  if (excludeUserIds) {
    const stats = sseManager.getStats();
    // This is a simple approach - in production you might want a more efficient lookup
    excludeConnections = Object.keys(stats.connectionsByUser).filter((userId) =>
      excludeUserIds.includes(userId),
    );
  }

  await sseManager.broadcast(sseEvent, excludeConnections);
  log.info("Broadcast notification sent", {
    event,
    dataKeys: Object.keys(data),
    excludedUsers: excludeUserIds?.length ?? 0,
  });
}

/**
 * Send system-wide alerts (maintenance, updates, etc.)
 */
export async function sendSystemAlert(
  message: string,
  severity: "info" | "warning" | "error" = "info",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const sseEvent: SSEEvent = {
    event: "system_alert",
    data: {
      message,
      severity,
      metadata,
      timestamp: new Date().toISOString(),
    },
  };

  await sseManager.broadcast(sseEvent);
  log.info("System alert sent", { message, severity });
}

/**
 * Send real-time updates for specific resources (e.g., "video_processed", "document_updated")
 */
export async function sendResourceUpdate(
  resourceType: string,
  resourceId: string,
  action: string,
  data: Record<string, unknown>,
  targetUserIds?: string[],
): Promise<void> {
  const sseEvent: SSEEvent = {
    event: "resource_update",
    data: {
      resourceType,
      resourceId,
      action,
      ...data,
      timestamp: new Date().toISOString(),
    },
  };

  const options: SendEventOptions = targetUserIds
    ? { userIds: targetUserIds }
    : { broadcast: true };

  await sseManager.sendEvent(sseEvent, options);
  log.info("Resource update sent", {
    resourceType,
    resourceId,
    action,
    targetUsers: targetUserIds?.length ?? "broadcast",
  });
}

/**
 * Send progress updates for long-running operations
 */
export async function sendProgressUpdate(
  operationId: string,
  progress: number,
  message?: string,
  targetUserIds?: string[],
): Promise<void> {
  const sseEvent: SSEEvent = {
    event: "progress_update",
    data: {
      operationId,
      progress: Math.min(100, Math.max(0, progress)), // Ensure 0-100 range
      message,
      timestamp: new Date().toISOString(),
    },
  };

  const options: SendEventOptions = targetUserIds
    ? { userIds: targetUserIds }
    : { broadcast: true };

  await sseManager.sendEvent(sseEvent, options);
  log.debug("Progress update sent", { operationId, progress, message });
}

/**
 * Get connection statistics (useful for monitoring dashboards)
 */
export function getConnectionStats() {
  return sseManager.getStats();
}

/**
 * Disconnect specific users (useful for security/admin actions)
 */
export async function disconnectUser(userId: string): Promise<void> {
  await sseManager.closeUserConnections(userId);
  log.info("User connections closed", { userId });
}

/**
 * Send custom events with full control over options
 */
export async function sendCustomEvent(
  event: SSEEvent,
  options?: SendEventOptions,
): Promise<void> {
  await sseManager.sendEvent(event, options);
  log.info("Custom event sent", { event: event.event, options });
}

/**
 * Utility for webhook handlers to easily send notifications
 * Common pattern: webhook receives data, processes it, sends SSE update
 */
export const webhookNotifier = {
  /**
   * Video processing webhook notifications
   */
  videoProcessed: async (
    videoId: string,
    status: "ready" | "failed" | "processing",
    userId?: string,
  ) => {
    await sendResourceUpdate(
      "video",
      videoId,
      "status_changed",
      { status },
      userId ? [userId] : undefined,
    );
  },

  /**
   * Payment webhook notifications
   */
  paymentStatusChanged: async (
    paymentId: string,
    status: "succeeded" | "failed" | "pending",
    userId: string,
  ) => {
    await sendResourceUpdate(
      "payment",
      paymentId,
      "status_changed",
      { status },
      [userId],
    );
  },

  /**
   * User-related webhook notifications
   */
  userUpdated: async (userId: string, changes: Record<string, unknown>) => {
    await notifyUsers("user_updated", { changes }, [userId]);
  },
};
