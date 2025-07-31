import { sseManager } from "./sse-manager";
import type { SSEEvent, BroadcastOptions } from "../types";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEUtils");

/**
 * Utility functions for easy SSE integration from backend services
 */
export class SSENotificationService {
  /**
   * Send a notification to a specific user
   */
  static async notifyUser(
    userId: string,
    event: string,
    data: unknown,
  ): Promise<boolean> {
    const sseEvent: SSEEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };

    const sentCount = sseManager.sendToUser(userId, sseEvent);

    log.info("User notification sent", {
      userId,
      event,
      sentCount,
      success: sentCount > 0,
    });

    return sentCount > 0;
  }

  /**
   * Send notifications to multiple users
   */
  static async notifyUsers(
    userIds: string[],
    event: string,
    data: unknown,
  ): Promise<number> {
    const sseEvent: SSEEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };

    const sentCount = sseManager.broadcast(sseEvent, { userIds });

    log.info("Multi-user notification sent", {
      userIds,
      event,
      sentCount,
    });

    return sentCount;
  }

  /**
   * Broadcast notification to all connected clients
   */
  static async broadcast(
    event: string,
    data: unknown,
    options?: Omit<BroadcastOptions, "userIds" | "clientIds">,
  ): Promise<number> {
    const sseEvent: SSEEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };

    const sentCount = sseManager.broadcast(sseEvent, options);

    log.info("Broadcast notification sent", {
      event,
      sentCount,
      options,
    });

    return sentCount;
  }

  /**
   * Notify about video processing status (useful for Mux integration)
   */
  static async notifyVideoProcessing(
    userId: string,
    videoId: string,
    status: "uploaded" | "processing" | "ready" | "error",
    details?: unknown,
  ): Promise<boolean> {
    return this.notifyUser(userId, "video_processing", {
      videoId,
      status,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connection statistics
   */
  static getConnectionStats() {
    return sseManager.getStats();
  }

  /**
   * Get all connected clients (for admin purposes)
   */
  static getConnectedClients() {
    return sseManager.getClients();
  }

  /**
   * Disconnect a specific client (for admin purposes)
   */
  static disconnectClient(clientId: string): void {
    sseManager.disconnectClient(clientId);
  }
}

/**
 * Quick utility functions for common use cases
 */

// Export individual utility functions for convenience
export const notifyUser = SSENotificationService.notifyUser.bind(
  SSENotificationService,
);
export const notifyUsers = SSENotificationService.notifyUsers.bind(
  SSENotificationService,
);
export const broadcast = SSENotificationService.broadcast.bind(
  SSENotificationService,
);
export const notifyVideoProcessing =
  SSENotificationService.notifyVideoProcessing.bind(SSENotificationService);
