import { sendSSEEvent, getSSEManager } from "@/lib/sse/manager";
import { SSEEventType } from "@/lib/sse/types";
import type { SendEventOptions } from "@/lib/sse/types";
import { createServiceContext } from "@/utils/service-utils";

// Create service context for logging and error handling
const { log, handleError } = createServiceContext("SSEService");

/**
 * SSE Service - High-level service for sending SSE events
 * This service provides a clean interface for other features to send SSE events
 */
export const sseService = {
  /**
   * Send a notification to a specific user
   */
  async sendUserNotification(
    userId: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      await sendSSEEvent(
        SSEEventType.NOTIFICATION,
        {
          title,
          message,
          data,
          notificationType: "user",
        },
        { userId },
      );

      log.info("Sent user notification", { userId, title });
    } catch (error) {
      handleError("Failed to send user notification", error);
      throw error;
    }
  },

  /**
   * Broadcast a notification to all connected users
   */
  async broadcastNotification(
    title: string,
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      await sendSSEEvent(
        SSEEventType.BROADCAST,
        {
          title,
          message,
          data,
          notificationType: "broadcast",
        },
        { broadcast: true },
      );

      log.info("Broadcasted notification", { title });
    } catch (error) {
      handleError("Failed to broadcast notification", error);
      throw error;
    }
  },

  /**
   * Send a test message (for demo purposes)
   */
  async sendTestMessage(
    message: string,
    options: SendEventOptions = {},
  ): Promise<void> {
    try {
      await sendSSEEvent(
        SSEEventType.TEST_MESSAGE,
        {
          message,
          timestamp: Date.now(),
          source: "sse-service",
        },
        options,
      );

      log.info("Sent test message", { message, options });
    } catch (error) {
      handleError("Failed to send test message", error);
      throw error;
    }
  },

  /**
   * Send a user update event
   */
  async sendUserUpdate(
    userId: string,
    updateType: string,
    data: any,
  ): Promise<void> {
    try {
      await sendSSEEvent(
        SSEEventType.USER_UPDATE,
        {
          updateType,
          data,
          timestamp: Date.now(),
        },
        { userId },
      );

      log.info("Sent user update", { userId, updateType });
    } catch (error) {
      handleError("Failed to send user update", error);
      throw error;
    }
  },

  /**
   * Send a custom event
   */
  async sendCustomEvent(
    eventType: string,
    data: any,
    options: SendEventOptions = {},
  ): Promise<void> {
    try {
      await sendSSEEvent(eventType, data, options);
      log.info("Sent custom event", { eventType, options });
    } catch (error) {
      handleError("Failed to send custom event", error);
      throw error;
    }
  },

  /**
   * Get SSE statistics
   */
  async getStats(): Promise<{
    totalConnections: number;
    userConnections: string[];
  }> {
    try {
      const manager = getSSEManager();
      const totalConnections = await manager.getConnectionsCount();

      // For demo purposes, we'll return basic stats
      return {
        totalConnections,
        userConnections: [], // Would need to implement user listing in manager
      };
    } catch (error) {
      handleError("Failed to get SSE stats", error);
      return {
        totalConnections: 0,
        userConnections: [],
      };
    }
  },
};
