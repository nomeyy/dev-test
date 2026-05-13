import { createServiceContext } from "@/utils/service-utils";
import { sseManager } from "./sse-manager";
import type {
  SSEService,
  NotificationEventData,
  UploadProgressEventData,
} from "../types";

const { log, handleError } = createServiceContext("SSEService");

class SSEBusinessService implements SSEService {
  // Send a notification to a specific user
  async notifyUser(
    userId: string,
    notification: NotificationEventData,
  ): Promise<boolean> {
    try {
      log.info("Sending notification to user", {
        userId,
        title: notification.title,
        severity: notification.severity,
      });

      const event = {
        type: "user_notification",
        data: {
          ...notification,
          timestamp: Date.now(),
        },
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const successCount = await sseManager.sendToUser(userId, event);

      log.info("Notification sent", {
        userId,
        successCount,
        notificationId: event.id,
      });

      return successCount > 0;
    } catch (error) {
      return handleError("sending user notification", error);
    }
  }

  // Broadcast a system alert to all connected users
  async broadcastAlert(alert: NotificationEventData): Promise<number> {
    try {
      log.info("Broadcasting system alert", {
        title: alert.title,
        severity: alert.severity,
      });

      const event = {
        type: "system_alert",
        data: {
          ...alert,
          timestamp: Date.now(),
        },
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const successCount = await sseManager.broadcast(event);

      log.info("System alert broadcasted", {
        successCount,
        alertId: event.id,
      });

      return successCount;
    } catch (error) {
      return handleError("broadcasting system alert", error);
    }
  }

  // Update upload progress for a user
  async updateUploadProgress(
    userId: string,
    progress: UploadProgressEventData,
  ): Promise<boolean> {
    try {
      const event = {
        type: "upload_progress",
        data: progress,
        id: `upload-${progress.uploadId}-${Date.now()}`,
      };

      const successCount = await sseManager.sendToUser(userId, event);

      if (progress.status === "complete") {
        log.info("Upload completed", {
          userId,
          uploadId: progress.uploadId,
          successCount,
        });
      }

      return successCount > 0;
    } catch (error) {
      log.error("Failed to update upload progress", error, {
        userId,
        uploadId: progress.uploadId,
      });
      return false;
    }
  }

  // Send a custom event
  async sendCustomEvent<T = Record<string, unknown>>(
    userId: string | null,
    eventType: string,
    data: T,
  ): Promise<number> {
    try {
      const event = {
        type: eventType,
        data,
        id: `custom-${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      let successCount: number;

      if (userId) {
        successCount = await sseManager.sendToUser(userId, event);
        log.info("Custom event sent to user", {
          userId,
          eventType,
          successCount,
        });
      } else {
        successCount = await sseManager.broadcast(event);
        log.info("Custom event broadcasted", {
          eventType,
          successCount,
        });
      }

      return successCount;
    } catch (error) {
      log.error("Failed to send custom event", error, {
        userId,
        eventType,
      });
      return 0;
    }
  }

  // Get connection stats
  getStats() {
    try {
      const allConnections = sseManager.getAllConnections();
      const userCounts: Record<string, number> = {};

      for (const connection of allConnections) {
        userCounts[connection.userId] =
          (userCounts[connection.userId] ?? 0) + 1;
      }

      const stats = {
        totalConnections: allConnections.length,
        uniqueUsers: Object.keys(userCounts).length,
        connectionsPerUser: userCounts,
      };

      log.info("Generated SSE stats", stats);
      return stats;
    } catch (error) {
      log.error("Failed to generate SSE stats", error);
      return {
        totalConnections: 0,
        uniqueUsers: 0,
        connectionsPerUser: {},
      };
    }
  }

  // Send a welcome message to a newly connected user
  async sendWelcomeMessage(
    userId: string,
    userName?: string,
  ): Promise<boolean> {
    const welcomeNotification: NotificationEventData = {
      title: "Connected!",
      message: `Welcome ${userName ?? "User"}! You're now receiving real-time updates.`,
      severity: "success",
      timestamp: Date.now(),
    };

    return this.notifyUser(userId, welcomeNotification);
  }

  // // TODO: Adding if needed
  // // Typing indicator
  // async sendTypingIndicator(
  //   userId: string,
  //   isTyping: boolean,
  // ): Promise<boolean> {
  //   return (
  //     (await this.sendCustomEvent(userId, "typing_indicator", {
  //       isTyping,
  //       timestamp: Date.now(),
  //     })) > 0
  //   );
  // }

  // Send system notifications
  async notifyMaintenance(
    message: string,
    scheduledTime?: Date,
  ): Promise<number> {
    const maintenanceAlert: NotificationEventData = {
      title: "System Maintenance",
      message,
      severity: "warning",
      timestamp: Date.now(),
    };

    return this.broadcastAlert(maintenanceAlert);
  }
}

// singleton instance
export const sseService = new SSEBusinessService();
