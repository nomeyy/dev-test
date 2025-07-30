import { sseService } from "../services/sse-service";
import type { SSEEvent, SendEventOptions } from "@/types/sse";
import { SSE_EVENT_TYPES } from "@/types/sse";
import { logger } from "@/utils/logging";

const contextLogger = logger.createContextLogger("SSE-Utils");

/**
 * Send a notification to specific users
 */
export async function sendNotificationToUsers(
  userIds: string | string[],
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const event: SSEEvent = {
    type: SSE_EVENT_TYPES.NOTIFICATION,
    data: {
      message,
      type,
      timestamp: new Date().toISOString(),
      metadata,
    },
    id: `notification-${Date.now()}`,
  };

  const targetUserIds = Array.isArray(userIds) ? userIds : [userIds];

  await sseService.sendEvent(event, { userIds: targetUserIds });

  contextLogger.info("Notification sent to users", {
    userIds: targetUserIds,
    type,
    message,
  });
}

/**
 * Broadcast a notification to all connected users
 */
export async function broadcastNotification(
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const event: SSEEvent = {
    type: SSE_EVENT_TYPES.NOTIFICATION,
    data: {
      message,
      type,
      timestamp: new Date().toISOString(),
      metadata,
    },
    id: `broadcast-${Date.now()}`,
  };

  await sseService.sendEvent(event, { broadcast: true });

  contextLogger.info("Notification broadcasted", { type, message });
}

/**
 * Send video upload progress update to a user
 */
export async function sendVideoUploadProgress(
  userId: string,
  uploadId: string,
  progress: number,
  status: "uploading" | "processing" | "complete" | "error",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const event: SSEEvent = {
    type: SSE_EVENT_TYPES.VIDEO_UPLOAD_PROGRESS,
    data: {
      uploadId,
      progress,
      status,
      timestamp: new Date().toISOString(),
      metadata,
    },
    id: `upload-${uploadId}-${Date.now()}`,
  };

  await sseService.sendEvent(event, { userIds: [userId] });

  contextLogger.info("Video upload progress sent", {
    userId,
    uploadId,
    progress,
    status,
  });
}

/**
 * Send video ready notification to a user
 */
export async function sendVideoReady(
  userId: string,
  assetId: string,
  videoData: {
    title?: string;
    duration?: number;
    playbackUrl?: string;
    thumbnailUrl?: string;
  },
): Promise<void> {
  const event: SSEEvent = {
    type: SSE_EVENT_TYPES.VIDEO_READY,
    data: {
      assetId,
      ...videoData,
      timestamp: new Date().toISOString(),
    },
    id: `video-ready-${assetId}`,
  };

  await sseService.sendEvent(event, { userIds: [userId] });

  contextLogger.info("Video ready notification sent", {
    userId,
    assetId,
    title: videoData.title,
  });
}

/**
 * Send user profile update notification
 */
export async function sendUserUpdate(
  userId: string,
  updateType: "profile" | "settings" | "status",
  data: Record<string, unknown>,
): Promise<void> {
  const event: SSEEvent = {
    type: SSE_EVENT_TYPES.USER_UPDATE,
    data: {
      updateType,
      ...data,
      timestamp: new Date().toISOString(),
    },
    id: `user-update-${userId}-${Date.now()}`,
  };

  await sseService.sendEvent(event, { userIds: [userId] });

  contextLogger.info("User update sent", { userId, updateType });
}

/**
 * Send custom event to specific users
 */
export async function sendCustomEvent(
  eventType: string,
  data: unknown,
  options: SendEventOptions,
  eventId?: string,
): Promise<void> {
  const event: SSEEvent = {
    type: eventType,
    data,
    id: eventId ?? `custom-${Date.now()}`,
  };

  await sseService.sendEvent(event, options);

  contextLogger.info("Custom event sent", {
    eventType,
    options,
  });
}

/**
 * Get current SSE service statistics
 */
export async function getSSEStats(): Promise<{
  totalClients: number;
  authenticatedClients: number;
  anonymousClients: number;
  userDistribution: Record<string, number>;
}> {
  const clients = await sseService.getClients();

  const stats = {
    totalClients: clients.length,
    authenticatedClients: clients.filter((c) => c.userId).length,
    anonymousClients: clients.filter((c) => !c.userId).length,
    userDistribution: {} as Record<string, number>,
  };

  // Count clients per user
  for (const client of clients) {
    if (client.userId) {
      stats.userDistribution[client.userId] =
        (stats.userDistribution[client.userId] ?? 0) + 1;
    }
  }

  return stats;
}
