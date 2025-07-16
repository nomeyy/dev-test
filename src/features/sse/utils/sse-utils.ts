import { sseService } from "../services/sse-service";
import { SSEEventType } from "../types";
import type { SSEEvent, SSESendOptions } from "../types";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEUtils");

/**
 * Utility functions for sending SSE events from backend modules
 * Provides a clean interface for webhook handlers, job processors, etc.
 */

/**
 * Sends a notification to a specific user
 * @param userId - The user ID to send the notification to
 * @param message - The notification message
 * @param data - Additional data to include
 */
export async function sendUserNotification(
  userId: string,
  message: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const event: SSEEvent = {
    type: SSEEventType.NOTIFICATION,
    data: {
      message,
      ...data,
    },
    timestamp: Date.now(),
  };

  await sseService.sendEvent(event, { userId });
  log.info("User notification sent", { userId, message });
}

/**
 * Sends a notification to all connected clients
 * @param message - The notification message
 * @param data - Additional data to include
 * @param excludeUserIds - User IDs to exclude from the broadcast
 */
export async function broadcastNotification(
  message: string,
  data: Record<string, unknown> = {},
  excludeUserIds: string[] = [],
): Promise<void> {
  const event: SSEEvent = {
    type: SSEEventType.NOTIFICATION,
    data: {
      message,
      ...data,
    },
    timestamp: Date.now(),
  };

  const options: SSESendOptions = {
    broadcast: true,
    excludeConnectionIds: [], // This would need to be implemented to exclude specific users
  };

  await sseService.sendEvent(event, options);
  log.info("Broadcast notification sent", { message, excludeUserIds });
}

/**
 * Sends upload progress updates to a specific user
 * @param userId - The user ID to send the update to
 * @param uploadId - The upload ID
 * @param progress - Progress percentage (0-100)
 * @param status - Upload status
 */
export async function sendUploadProgress(
  userId: string,
  uploadId: string,
  progress: number,
  status: "uploading" | "processing" | "completed" | "failed",
): Promise<void> {
  const event: SSEEvent = {
    type: SSEEventType.UPLOAD_PROGRESS,
    data: {
      uploadId,
      progress,
      status,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  await sseService.sendEvent(event, { userId });
  log.info("Upload progress sent", { userId, uploadId, progress, status });
}

/**
 * Sends asset ready notification to a specific user
 * @param userId - The user ID to send the notification to
 * @param assetId - The asset ID
 * @param assetUrl - The asset URL
 * @param metadata - Additional asset metadata
 */
export async function sendAssetReady(
  userId: string,
  assetId: string,
  assetUrl: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const event: SSEEvent = {
    type: SSEEventType.ASSET_READY,
    data: {
      assetId,
      assetUrl,
      metadata,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  await sseService.sendEvent(event, { userId });
  log.info("Asset ready notification sent", { userId, assetId });
}

/**
 * Sends user update notification to a specific user
 * @param userId - The user ID to send the update to
 * @param updateType - Type of user update
 * @param data - Update data
 */
export async function sendUserUpdate(
  userId: string,
  updateType: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const event: SSEEvent = {
    type: SSEEventType.USER_UPDATE,
    data: {
      updateType,
      ...data,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  await sseService.sendEvent(event, { userId });
  log.info("User update sent", { userId, updateType });
}

/**
 * Sends a custom event to specific targets
 * @param eventType - The custom event type
 * @param data - Event data
 * @param options - Send options (userId, sessionId, broadcast, etc.)
 */
export async function sendCustomEvent(
  eventType: SSEEventType,
  data: Record<string, unknown>,
  options: SSESendOptions = {},
): Promise<void> {
  const event: SSEEvent = {
    type: eventType,
    data: {
      ...data,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  await sseService.sendEvent(event, options);
  log.info("Custom event sent", { eventType, options });
}

/**
 * Gets SSE connection statistics
 * @returns Connection statistics
 */
export function getSSEStats() {
  return sseService.getStats();
}
