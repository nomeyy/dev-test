import { createServiceContext } from "@/utils/service-utils";
import { getSSEConnectionManager } from "./sse-connection-manager";
import type { SSEServiceType, SSENotificationEvent, SSEEvent } from "../types";
import { SSENotificationEventSchema } from "../types";

const { log, handleError } = createServiceContext("SSEService");

/**
 * SSE Service - High-level API for backend integration
 * Provides clean interface for sending notifications without managing SSE protocol details
 */
export class SSEService implements SSEServiceType {
  private connectionManager = getSSEConnectionManager();

  /**
   * Send a notification to a specific user
   */
  async sendNotification(
    userId: string,
    notification: SSENotificationEvent,
  ): Promise<boolean> {
    try {
      const validatedNotification =
        SSENotificationEventSchema.parse(notification);

      const event: SSEEvent = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        event: "notification",
        data: validatedNotification,
        timestamp: Date.now(),
      };

      const successCount = await this.connectionManager.sendToUser(
        userId,
        event,
      );

      log.info("Notification sent", {
        userId,
        type: notification.type,
        message: notification.message,
        successCount,
      });

      return successCount > 0;
    } catch (error) {
      return handleError("sending notification", error);
    }
  }

  /**
   * Send an alert to a specific user
   */
  async sendAlert(
    userId: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendNotification(userId, {
      type: "alert",
      message,
      data,
      priority: "high",
    });
  }

  /**
   * Send an update to a specific user
   */
  async sendUpdate(
    userId: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendNotification(userId, {
      type: "update",
      message,
      data,
      priority: "medium",
    });
  }

  /**
   * Send a system message to all connected users
   */
  async sendSystemMessage(
    message: string,
    data?: Record<string, any>,
  ): Promise<number> {
    try {
      const event: SSEEvent = {
        id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        event: "system",
        data: {
          type: "system",
          message,
          data,
          priority: "high",
        },
        timestamp: Date.now(),
      };

      const successCount = await this.connectionManager.broadcast(event);

      log.info("System message sent", {
        message,
        successCount,
      });

      return successCount;
    } catch (error) {
      return handleError("sending system message", error);
    }
  }

  /**
   * Send a custom event to a specific user
   */
  async sendCustomEvent(
    userId: string,
    eventType: string,
    data: Record<string, any>,
  ): Promise<boolean> {
    try {
      const event: SSEEvent = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        event: eventType,
        data,
        timestamp: Date.now(),
      };

      const successCount = await this.connectionManager.sendToUser(
        userId,
        event,
      );

      log.info("Custom event sent", {
        userId,
        eventType,
        successCount,
      });

      return successCount > 0;
    } catch (error) {
      return handleError("sending custom event", error);
    }
  }

  /**
   * Send a custom event to all users in a session
   */
  async sendSessionEvent(
    sessionId: string,
    eventType: string,
    data: Record<string, any>,
  ): Promise<number> {
    try {
      const event: SSEEvent = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        event: eventType,
        data,
        timestamp: Date.now(),
      };

      const successCount = await this.connectionManager.sendToSession(
        sessionId,
        event,
      );

      log.info("Session event sent", {
        sessionId,
        eventType,
        successCount,
      });

      return successCount;
    } catch (error) {
      return handleError("sending session event", error);
    }
  }

  /**
   * Broadcast a custom event to all connected clients
   */
  async broadcastEvent(
    eventType: string,
    data: Record<string, any>,
  ): Promise<number> {
    try {
      const event: SSEEvent = {
        id: `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        event: eventType,
        data,
        timestamp: Date.now(),
      };

      const successCount = await this.connectionManager.broadcast(event);

      log.info("Broadcast event sent", {
        eventType,
        successCount,
      });

      return successCount;
    } catch (error) {
      return handleError("broadcasting event", error);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return this.connectionManager.getStats();
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connectionManager.getClientCount();
  }

  /**
   * Get all active clients (for debugging/monitoring)
   */
  getActiveClients() {
    return this.connectionManager.getActiveClients();
  }

  /**
   * Clean up all connections (for shutdown)
   */
  async cleanup(): Promise<void> {
    await this.connectionManager.cleanup();
  }
}

// Singleton instance
let sseServiceInstance: SSEService | null = null;

/**
 * Get the singleton SSE service instance
 */
export function getSSEService(): SSEService {
  if (!sseServiceInstance) {
    sseServiceInstance = new SSEService();
  }
  return sseServiceInstance;
}

// Export the singleton instance as the default export
export const sseService = getSSEService();
