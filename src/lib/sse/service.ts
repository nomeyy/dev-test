import { sseManager } from "./manager";
import { createServiceContext } from "@/utils/service-utils";
import type { SSEService, SSEEventData } from "./types";

const { log, handleError } = createServiceContext("SSE-Service");

/**
 * SSE Service providing high-level API for backend modules to send notifications
 */
export const sseService: SSEService = {
  /**
   * Send a notification to a specific user
   */
  async sendNotification(
    userId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const data: SSEEventData = {
        timestamp: new Date().toISOString(),
        message,
        ...metadata,
      };

      await sseManager.sendToUser(userId, "notification", data);
      log.info("Notification sent", { userId, message });
    } catch (error) {
      handleError("sending notification", error);
    }
  },

  /**
   * Send a custom event to a specific user
   */
  async sendCustomEvent(
    userId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const eventData: SSEEventData = {
        timestamp: new Date().toISOString(),
        ...data,
      };

      await sseManager.sendToUser(userId, "custom", eventData, eventType);
      log.info("Custom event sent", { userId, eventType });
    } catch (error) {
      handleError("sending custom event", error);
    }
  },

  /**
   * Broadcast a notification to all connected users
   */
  async broadcastNotification(
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const data: SSEEventData = {
        timestamp: new Date().toISOString(),
        message,
        ...metadata,
      };

      await sseManager.broadcast("notification", data);
      log.info("Broadcast notification sent", {
        message,
        totalClients: sseManager.getConnectionCount(),
      });
    } catch (error) {
      handleError("broadcasting notification", error);
    }
  },
};

/**
 * Utility functions for common SSE operations
 */
export const sseUtils = {
  /**
   * Send error notification to user
   */
  async sendError(
    userId: string,
    errorMessage: string,
    context?: string,
  ): Promise<void> {
    try {
      const data: SSEEventData = {
        timestamp: new Date().toISOString(),
        message: errorMessage,
        context,
        type: "error",
      };

      await sseManager.sendToUser(userId, "error", data);
      log.info("Error notification sent", { userId, errorMessage, context });
    } catch (error) {
      handleError("sending error notification", error);
    }
  },

  /**
   * Send success notification to user
   */
  async sendSuccess(
    userId: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const eventData: SSEEventData = {
        timestamp: new Date().toISOString(),
        message,
        type: "success",
        ...data,
      };

      await sseManager.sendToUser(userId, "notification", eventData);
      log.info("Success notification sent", { userId, message });
    } catch (error) {
      handleError("sending success notification", error);
    }
  },

  /**
   * Send system maintenance notification to all users
   */
  async sendMaintenanceNotification(
    message: string,
    estimatedDuration?: string,
  ): Promise<void> {
    try {
      const data: SSEEventData = {
        timestamp: new Date().toISOString(),
        message,
        type: "maintenance",
        estimatedDuration,
      };

      await sseManager.broadcast("notification", data);
      log.info("Maintenance notification broadcasted", {
        message,
        estimatedDuration,
      });
    } catch (error) {
      handleError("sending maintenance notification", error);
    }
  },

  /**
   * Get connection statistics
   */
  getStats() {
    const connections = sseManager.getActiveConnections();
    const totalConnections = sseManager.getConnectionCount();
    const uniqueUsers = connections.size;

    return {
      totalConnections,
      uniqueUsers,
      connectionsPerUser: Array.from(connections.entries()).map(
        ([userId, clients]) => ({
          userId,
          connectionCount: clients.length,
        }),
      ),
    };
  },
};
