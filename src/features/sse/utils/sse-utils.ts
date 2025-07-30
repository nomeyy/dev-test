import { sseManager } from "../services/sse-manager";
import type { SSEEventPayload, SSEBroadcastOptions } from "../types";

/**
 * Utility functions for backend modules to send SSE notifications
 */

/**
 * Send a notification to a specific client
 */
export async function sendNotificationToClient(
  clientId: string,
  event: string,
  payload: SSEEventPayload,
): Promise<boolean> {
  return sseManager.sendToClient(clientId, event, payload);
}

/**
 * Send a notification to a specific user (all their connections)
 */
export async function sendNotificationToUser(
  userId: string,
  event: string,
  payload: SSEEventPayload,
): Promise<number> {
  return sseManager.sendToUser(userId, event, payload);
}

/**
 * Send a notification to a specific session (all connections in that session)
 */
export async function sendNotificationToSession(
  sessionId: string,
  event: string,
  payload: SSEEventPayload,
): Promise<number> {
  return sseManager.sendToSession(sessionId, event, payload);
}

/**
 * Broadcast a notification to all connected clients
 */
export async function broadcastNotification(
  event: string,
  payload: SSEEventPayload,
  options?: SSEBroadcastOptions,
): Promise<number> {
  return sseManager.broadcast(event, payload, options);
}

/**
 * Send a system notification (e.g., maintenance, updates)
 */
export async function sendSystemNotification(
  message: string,
  type: "info" | "warning" | "error" = "info",
  metadata?: Record<string, unknown>,
): Promise<number> {
  return sseManager.broadcast("system", {
    message,
    type,
    timestamp: Date.now(),
    ...metadata,
  });
}

/**
 * Send a user-specific notification (e.g., new message, friend request)
 */
export async function sendUserNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  actionUrl?: string,
): Promise<number> {
  return sseManager.sendToUser(userId, "notification", {
    title,
    message,
    type,
    timestamp: Date.now(),
    actionUrl,
  });
}

/**
 * Send a real-time update (e.g., live data updates)
 */
export async function sendRealtimeUpdate(
  event: string,
  data: unknown,
  target?: "all" | "user" | "session",
  targetId?: string,
): Promise<number> {
  const payload = {
    data: data as SSEEventPayload,
    timestamp: Date.now(),
  };

  switch (target) {
    case "user":
      if (!targetId)
        throw new Error("User ID required for user-targeted updates");
      return sseManager.sendToUser(targetId, event, payload);
    case "session":
      if (!targetId)
        throw new Error("Session ID required for session-targeted updates");
      return sseManager.sendToSession(targetId, event, payload);
    default:
      return sseManager.broadcast(event, payload);
  }
}

/**
 * Send a progress update (e.g., file upload, processing status)
 */
export async function sendProgressUpdate(
  taskId: string,
  progress: number,
  status: "pending" | "processing" | "completed" | "failed",
  message?: string,
  targetClientId?: string,
): Promise<boolean | number> {
  const payload = {
    taskId,
    progress,
    status,
    message,
    timestamp: Date.now(),
  };

  if (targetClientId) {
    return sseManager.sendToClient(targetClientId, "progress", payload);
  } else {
    return sseManager.broadcast("progress", payload);
  }
}

/**
 * Send a chat message notification
 */
export async function sendChatMessage(
  userId: string,
  message: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    roomId?: string;
  },
): Promise<number> {
  return sseManager.sendToUser(userId, "chat_message", message);
}

/**
 * Send a friend request notification
 */
export async function sendFriendRequest(
  targetUserId: string,
  fromUserId: string,
  fromUserName: string,
): Promise<number> {
  return sseManager.sendToUser(targetUserId, "friend_request", {
    fromUserId,
    fromUserName,
    timestamp: Date.now(),
  });
}

/**
 * Send a video processing status update
 */
export async function sendVideoProcessingStatus(
  userId: string,
  videoId: string,
  status: "uploading" | "processing" | "completed" | "failed",
  progress?: number,
  error?: string,
): Promise<number> {
  return sseManager.sendToUser(userId, "video_processing", {
    videoId,
    status,
    progress,
    error,
    timestamp: Date.now(),
  });
}

/**
 * Get SSE connection statistics
 */
export function getSSEStats() {
  return sseManager.getStats();
}

/**
 * Check if a client is connected
 */
export function isClientConnected(clientId: string): boolean {
  return sseManager.isClientConnected(clientId);
}

/**
 * Get all active client IDs
 */
export function getActiveClientIds(): string[] {
  return sseManager.getActiveClientIds();
}
