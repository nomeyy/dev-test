import { nanoid } from "nanoid";
import { SSEEventType } from "../types";
import type {
  NotificationEvent,
  UserUpdateEvent,
  ReelUploadStatusEvent,
  SystemMessageEvent,
  PingEvent,
} from "../types";

/**
 * Factory functions for creating SSE events with proper structure and validation
 */
export const createSSEEvent = {
  /**
   * Create a notification event
   */
  notification: (data: {
    title: string;
    message: string;
    level?: "info" | "warning" | "error" | "success";
  }): NotificationEvent => ({
    id: nanoid(),
    type: SSEEventType.NOTIFICATION,
    timestamp: Date.now(),
    data: {
      level: "info",
      ...data,
    },
  }),

  /**
   * Create a user update event
   */
  userUpdate: (data: {
    userId: string;
    field: string;
    value: unknown;
  }): UserUpdateEvent => ({
    id: nanoid(),
    type: SSEEventType.USER_UPDATE,
    timestamp: Date.now(),
    data,
  }),

  /**
   * Create a reel upload status event
   */
  reelUploadStatus: (data: {
    uploadId: string;
    status: "uploading" | "processing" | "ready" | "error";
    progress?: number;
    message?: string;
  }): ReelUploadStatusEvent => ({
    id: nanoid(),
    type: SSEEventType.REEL_UPLOAD_STATUS,
    timestamp: Date.now(),
    data,
  }),

  /**
   * Create a system message event
   */
  systemMessage: (data: {
    message: string;
    level?: "info" | "warning" | "error";
  }): SystemMessageEvent => ({
    id: nanoid(),
    type: SSEEventType.SYSTEM_MESSAGE,
    timestamp: Date.now(),
    data: {
      level: "info",
      ...data,
    },
  }),

  /**
   * Create a ping event
   */
  ping: (message = "ping"): PingEvent => ({
    id: nanoid(),
    type: SSEEventType.PING,
    timestamp: Date.now(),
    data: { message },
  }),
};

/**
 * Convenience functions for common use cases
 */
export const sseEvents = {
  /**
   * Create a success notification
   */
  success: (title: string, message: string) =>
    createSSEEvent.notification({ title, message, level: "success" }),

  /**
   * Create an error notification
   */
  error: (title: string, message: string) =>
    createSSEEvent.notification({ title, message, level: "error" }),

  /**
   * Create a warning notification
   */
  warning: (title: string, message: string) =>
    createSSEEvent.notification({ title, message, level: "warning" }),

  /**
   * Create an info notification
   */
  info: (title: string, message: string) =>
    createSSEEvent.notification({ title, message, level: "info" }),

  /**
   * Create a video upload started event
   */
  videoUploadStarted: (uploadId: string) =>
    createSSEEvent.reelUploadStatus({
      uploadId,
      status: "uploading",
      progress: 0,
      message: "Upload started",
    }),

  /**
   * Create a video processing event
   */
  videoProcessing: (uploadId: string, progress?: number) =>
    createSSEEvent.reelUploadStatus({
      uploadId,
      status: "processing",
      progress,
      message: "Processing video...",
    }),

  /**
   * Create a video ready event
   */
  videoReady: (uploadId: string) =>
    createSSEEvent.reelUploadStatus({
      uploadId,
      status: "ready",
      progress: 100,
      message: "Video is ready!",
    }),

  /**
   * Create a video error event
   */
  videoError: (uploadId: string, errorMessage: string) =>
    createSSEEvent.reelUploadStatus({
      uploadId,
      status: "error",
      message: errorMessage,
    }),

  /**
   * Create a profile update event
   */
  profileUpdate: (userId: string, field: string, value: unknown) =>
    createSSEEvent.userUpdate({ userId, field, value }),

  /**
   * Create a system maintenance warning
   */
  maintenanceWarning: (message: string) =>
    createSSEEvent.systemMessage({ message, level: "warning" }),

  /**
   * Create a system announcement
   */
  announcement: (message: string) =>
    createSSEEvent.systemMessage({ message, level: "info" }),
};
