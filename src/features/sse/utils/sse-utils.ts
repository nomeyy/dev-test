import { createServiceContext } from "@/utils/service-utils";
import { sseEventDispatcher } from "../services/event-dispatcher";
import type { SSEEvent, SSEEventType } from "../types";
import { SSE_EVENT_TYPES } from "../types";

const { log, handleError } = createServiceContext("SSEUtils");

export function sendSSEEvent(
  userId: string,
  eventType: SSEEventType,
  data: Record<string, unknown>,
): boolean {
  try {
    log.info("Sending SSE event via utility", { userId, eventType, data });

    return sseEventDispatcher.sendToUser(userId, {
      type: eventType,
      data,
    });
  } catch (error) {
    handleError("sending SSE event via utility", error);
    return false;
  }
}

export function broadcastSSEEvent(
  eventType: SSEEventType,
  data: Record<string, unknown>,
): boolean {
  try {
    log.info("Broadcasting SSE event via utility", { eventType, data });

    return sseEventDispatcher.broadcast({
      type: eventType,
      data,
    });
  } catch (error) {
    handleError("broadcasting SSE event via utility", error);
    return false;
  }
}

export function sendCustomSSEEvent(
  event: Omit<SSEEvent, "timestamp">,
): boolean {
  try {
    log.info("Sending custom SSE event via utility", { event });

    if (event.targetUserId) {
      return sseEventDispatcher.sendToUser(event.targetUserId, {
        type: event.type,
        data: event.data,
      });
    } else {
      return sseEventDispatcher.broadcast({
        type: event.type,
        data: event.data,
      });
    }
  } catch (error) {
    handleError("sending custom SSE event via utility", error);
    return false;
  }
}

export function notifyUploadProgress(
  userId: string,
  progress: number,
  uploadId: string,
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.UPLOAD_PROGRESS, {
    progress,
    uploadId,
  });
}

export function notifyUploadComplete(
  userId: string,
  uploadId: string,
  playbackId?: string,
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.UPLOAD_COMPLETE, {
    uploadId,
    playbackId,
  });
}

export function notifyUploadError(
  userId: string,
  uploadId: string,
  error: string,
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.UPLOAD_ERROR, {
    uploadId,
    error,
  });
}

export function notifyProcessingStarted(
  userId: string,
  uploadId: string,
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.PROCESSING_STARTED, { uploadId });
}

export function notifyProcessingComplete(
  userId: string,
  uploadId: string,
  playbackId: string,
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.PROCESSING_COMPLETE, {
    uploadId,
    playbackId,
  });
}

export function notifyProcessingError(
  userId: string,
  uploadId: string,
  error: string,
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.PROCESSING_ERROR, {
    uploadId,
    error,
  });
}

export function notifyUser(
  userId: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
): boolean {
  return sendSSEEvent(userId, SSE_EVENT_TYPES.USER_NOTIFICATION, {
    message,
    type,
  });
}

export function getSSEStats() {
  return sseEventDispatcher.getStats();
}

export function hasActiveConnections(userId: string): boolean {
  try {
    const stats = sseEventDispatcher.getStats();
    return stats.uniqueUsers > 0;
  } catch (error) {
    handleError("checking active connections", error);
    return false;
  }
}
