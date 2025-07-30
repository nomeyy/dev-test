import { sseManager } from "./sse-manager";
import type { SSEEvent, SSEMessage } from "./sse-manager";

/**
 * Utility class for sending SSE events from backend services
 */
export class SSEUtils {
  /**
   * Send notification to a specific user
   */
  static notifyUser(
    userId: string,
    event: string,
    data: any,
    metadata?: Record<string, any>,
  ) {
    const sseEvent: SSEEvent = {
      event,
      data: {
        ...data,
        timestamp: Date.now(),
        metadata,
      },
    };

    return sseManager.sendToUser(userId, sseEvent);
  }

  /**
   * Send notification to a specific session
   */
  static notifySession(
    sessionId: string,
    event: string,
    data: any,
    metadata?: Record<string, any>,
  ) {
    const sseEvent: SSEEvent = {
      event,
      data: {
        ...data,
        timestamp: Date.now(),
        metadata,
      },
    };

    return sseManager.sendToSession(sessionId, sseEvent);
  }

  /**
   * Broadcast notification to all connected clients
   */
  static broadcast(event: string, data: any, metadata?: Record<string, any>) {
    const sseEvent: SSEEvent = {
      event,
      data: {
        ...data,
        timestamp: Date.now(),
        metadata,
      },
    };

    return sseManager.broadcast(sseEvent);
  }

  /**
   * Send system notification (e.g., maintenance, updates)
   */
  static sendSystemNotification(
    message: string,
    type: "info" | "warning" | "error" = "info",
  ) {
    return this.broadcast("system", {
      message,
      type,
      timestamp: Date.now(),
    });
  }

  /**
   * Send real-time updates for specific entities
   */
  static sendEntityUpdate(
    entityType: string,
    entityId: string,
    action: string,
    data: any,
  ) {
    return this.broadcast("entity_update", {
      entityType,
      entityId,
      action,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current SSE statistics
   */
  static getStats() {
    return sseManager.getStats();
  }
}

/**
 * Example usage functions for common scenarios
 */
export const SSEExamples = {
  /**
   * Send webhook notification
   */
  sendWebhookNotification: (webhookData: any) => {
    return SSEUtils.broadcast("webhook", webhookData);
  },

  /**
   * Send job completion notification
   */
  sendJobNotification: (userId: string, jobId: string, status: string) => {
    return SSEUtils.notifyUser(userId, "job_update", {
      jobId,
      status,
    });
  },

  /**
   * Send chat message notification
   */
  sendChatMessage: (userId: string, message: any) => {
    return SSEUtils.notifyUser(userId, "chat_message", message);
  },

  /**
   * Send file upload progress
   */
  sendUploadProgress: (userId: string, fileId: string, progress: number) => {
    return SSEUtils.notifyUser(userId, "upload_progress", {
      fileId,
      progress,
    });
  },
};
