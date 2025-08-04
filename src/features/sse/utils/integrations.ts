import {
  notifyUser,
  notifyUsers,
  broadcast,
  realtimeUpdate,
  progressUpdate,
  successNotification,
  errorNotification,
} from "../utils/notifications";
import { logger } from "@/utils/logging";

/**
 * Integration utilities for common SSE use cases
 */

/**
 * Notify users about job/task completion
 */
export async function notifyJobCompletion(
  jobId: string,
  userId: string,
  result: "success" | "error",
  details?: Record<string, unknown>,
): Promise<void> {
  const baseData = {
    jobId,
    timestamp: new Date().toISOString(),
    ...details,
  };

  if (result === "success") {
    successNotification("Job completed successfully", baseData, userId);
  } else {
    errorNotification("Job failed to complete", baseData, userId);
  }

  logger.info("SSE", "Job completion notification sent", {
    jobId,
    userId,
    result,
  });
}

/**
 * Send progress updates for long-running operations
 */
export async function updateOperationProgress(
  operationId: string,
  userId: string,
  progress: number,
  message?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  progressUpdate(operationId, progress, message, userId);

  // Also send a real-time update with metadata
  if (metadata) {
    realtimeUpdate(
      "operation_progress",
      {
        operationId,
        progress,
        message,
        ...metadata,
      },
      [userId],
    );
  }
}

/**
 * Broadcast system announcements
 */
export async function announceSystemUpdate(
  title: string,
  message: string,
  severity: "info" | "warning" | "critical" = "info",
  targetUsers?: string[],
): Promise<number> {
  const announcement = {
    event: "system_announcement",
    data: {
      title,
      message,
      severity,
      timestamp: new Date().toISOString(),
    },
  };

  let notifiedCount: number;

  if (targetUsers && targetUsers.length > 0) {
    notifiedCount = notifyUsers(targetUsers, announcement);
  } else {
    notifiedCount = broadcast(announcement);
  }

  logger.info("SSE", "System announcement sent", {
    title,
    severity,
    targetUsers: targetUsers?.length || "all",
    notifiedCount,
  });

  return notifiedCount;
}

/**
 * Notify users about real-time data changes
 */
export async function notifyDataChange(
  entityType: string,
  entityId: string,
  changeType: "created" | "updated" | "deleted",
  data: unknown,
  affectedUsers?: string[],
): Promise<number> {
  const changeEvent = {
    event: "data_change",
    data: {
      entityType,
      entityId,
      changeType,
      data,
      timestamp: new Date().toISOString(),
    },
  };

  let notifiedCount: number;

  if (affectedUsers && affectedUsers.length > 0) {
    notifiedCount = notifyUsers(affectedUsers, changeEvent);
  } else {
    notifiedCount = broadcast(changeEvent);
  }

  logger.info("SSE", "Data change notification sent", {
    entityType,
    entityId,
    changeType,
    affectedUsers: affectedUsers?.length || "all",
    notifiedCount,
  });

  return notifiedCount;
}

/**
 * Send chat/messaging notifications
 */
export async function notifyNewMessage(
  conversationId: string,
  senderId: string,
  recipientIds: string[],
  messagePreview: string,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const messageEvent = {
    event: "new_message",
    data: {
      conversationId,
      senderId,
      messagePreview,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };

  const notifiedCount = notifyUsers(recipientIds, messageEvent);

  logger.info("SSE", "New message notification sent", {
    conversationId,
    senderId,
    recipientCount: recipientIds.length,
    notifiedCount,
  });

  return notifiedCount;
}

/**
 * Notify about user activity (e.g., user online/offline status)
 */
export async function notifyUserActivity(
  userId: string,
  activity: "online" | "offline" | "typing" | "idle",
  contextUsers?: string[],
  metadata?: Record<string, unknown>,
): Promise<number> {
  const activityEvent = {
    event: "user_activity",
    data: {
      userId,
      activity,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };

  let notifiedCount: number;

  if (contextUsers && contextUsers.length > 0) {
    notifiedCount = notifyUsers(contextUsers, activityEvent);
  } else {
    notifiedCount = broadcast(activityEvent);
  }

  logger.info("SSE", "User activity notification sent", {
    userId,
    activity,
    contextUsers: contextUsers?.length || "all",
    notifiedCount,
  });

  return notifiedCount;
}

/**
 * Send real-time analytics/metrics updates
 */
export async function notifyMetricsUpdate(
  metricType: string,
  value: number | string,
  change?: number,
  targetUsers?: string[],
): Promise<number> {
  const metricsEvent = {
    event: "metrics_update",
    data: {
      metricType,
      value,
      change,
      timestamp: new Date().toISOString(),
    },
  };

  let notifiedCount: number;

  if (targetUsers && targetUsers.length > 0) {
    notifiedCount = notifyUsers(targetUsers, metricsEvent);
  } else {
    notifiedCount = broadcast(metricsEvent);
  }

  logger.info("SSE", "Metrics update sent", {
    metricType,
    value,
    change,
    targetUsers: targetUsers?.length || "all",
    notifiedCount,
  });

  return notifiedCount;
}
