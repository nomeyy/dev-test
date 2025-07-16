import { sseService } from "../services/sse-service";
import type { SSENotificationEvent } from "../types";

/**
 * Utility functions for backend integration
 * These functions provide a simple interface for backend modules to send SSE events
 */

/**
 * Send a notification to a specific user
 */
export async function notifyUser(
  userId: string,
  notification: SSENotificationEvent,
): Promise<boolean> {
  return await sseService.sendNotification(userId, notification);
}

/**
 * Send an alert to a specific user
 */
export async function alertUser(
  userId: string,
  message: string,
  data?: Record<string, any>,
): Promise<boolean> {
  return await sseService.sendAlert(userId, message, data);
}

/**
 * Send an update to a specific user
 */
export async function updateUser(
  userId: string,
  message: string,
  data?: Record<string, any>,
): Promise<boolean> {
  return await sseService.sendUpdate(userId, message, data);
}

/**
 * Send a system-wide message to all connected users
 */
export async function systemBroadcast(
  message: string,
  data?: Record<string, any>,
): Promise<number> {
  return await sseService.sendSystemMessage(message, data);
}

/**
 * Send a custom event to a specific user
 */
export async function sendUserEvent(
  userId: string,
  eventType: string,
  data: Record<string, any>,
): Promise<boolean> {
  return await sseService.sendCustomEvent(userId, eventType, data);
}

/**
 * Send a custom event to all users in a session
 */
export async function sendSessionEvent(
  sessionId: string,
  eventType: string,
  data: Record<string, any>,
): Promise<number> {
  return await sseService.sendSessionEvent(sessionId, eventType, data);
}

/**
 * Broadcast a custom event to all connected users
 */
export async function broadcastEvent(
  eventType: string,
  data: Record<string, any>,
): Promise<number> {
  return await sseService.broadcastEvent(eventType, data);
}

/**
 * High-level notification helpers for common use cases
 */
export const notifications = {
  /**
   * Notify user about a successful action
   */
  success: (userId: string, message: string, data?: Record<string, any>) =>
    notifyUser(userId, {
      type: "notification",
      message,
      data,
      priority: "medium",
    }),

  /**
   * Notify user about an error
   */
  error: (userId: string, message: string, data?: Record<string, any>) =>
    alertUser(userId, message, data),

  /**
   * Notify user about an info message
   */
  info: (userId: string, message: string, data?: Record<string, any>) =>
    notifyUser(userId, {
      type: "notification",
      message,
      data,
      priority: "low",
    }),

  /**
   * Notify user about a warning
   */
  warning: (userId: string, message: string, data?: Record<string, any>) =>
    notifyUser(userId, {
      type: "alert",
      message,
      data,
      priority: "high",
    }),

  /**
   * Notify user about a progress update
   */
  progress: (userId: string, message: string, data?: Record<string, any>) =>
    updateUser(userId, message, data),
};

/**
 * System-wide notification helpers
 */
export const systemNotifications = {
  /**
   * Send maintenance notification
   */
  maintenance: (message: string, data?: Record<string, any>) =>
    systemBroadcast(`System Maintenance: ${message}`, data),

  /**
   * Send service update notification
   */
  serviceUpdate: (message: string, data?: Record<string, any>) =>
    systemBroadcast(`Service Update: ${message}`, data),

  /**
   * Send emergency notification
   */
  emergency: (message: string, data?: Record<string, any>) =>
    systemBroadcast(`Emergency: ${message}`, data),
};

/**
 * Integration helpers for specific features
 */
export const integrations = {
  /**
   * Video/upload related notifications
   */
  video: {
    uploadStarted: (userId: string, videoId: string) =>
      sendUserEvent(userId, "video.upload.started", { videoId }),

    uploadProgress: (userId: string, videoId: string, progress: number) =>
      sendUserEvent(userId, "video.upload.progress", { videoId, progress }),

    uploadCompleted: (userId: string, videoId: string) =>
      sendUserEvent(userId, "video.upload.completed", { videoId }),

    uploadFailed: (userId: string, videoId: string, error: string) =>
      alertUser(userId, `Video upload failed: ${error}`, { videoId }),
  },

  /**
   * Search related notifications
   */
  search: {
    indexingStarted: (userId: string, contentType: string) =>
      updateUser(userId, `Started indexing ${contentType}`, { contentType }),

    indexingCompleted: (userId: string, contentType: string) =>
      notifications.success(userId, `Indexing completed for ${contentType}`, {
        contentType,
      }),
  },

  /**
   * Email related notifications
   */
  email: {
    sent: (userId: string, emailType: string) =>
      notifications.success(userId, `Email sent: ${emailType}`, { emailType }),

    failed: (userId: string, emailType: string, error: string) =>
      alertUser(userId, `Email failed: ${error}`, { emailType }),
  },

  /**
   * User related notifications
   */
  user: {
    welcomeMessage: (userId: string) =>
      notifications.success(userId, "Welcome to Nomey!", { type: "welcome" }),

    profileUpdated: (userId: string) =>
      notifications.success(userId, "Profile updated successfully", {
        type: "profile",
      }),

    accountVerified: (userId: string) =>
      notifications.success(userId, "Account verified successfully", {
        type: "verification",
      }),
  },
};

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return sseService.getConnectionStats();
}

/**
 * Get active connection count
 */
export function getActiveConnectionCount(): number {
  return sseService.getActiveConnectionCount();
}
