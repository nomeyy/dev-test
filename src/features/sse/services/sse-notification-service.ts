import { getSSEManager } from "./sse-manager";
import { logger } from "@/utils/logging";
import type { SSEMessage, SSEEventType } from "../types";

export class SSENotificationService {
  private static instance: SSENotificationService;
  private manager = getSSEManager();

  private constructor() {}

  public static getInstance(): SSENotificationService {
    if (!SSENotificationService.instance) {
      SSENotificationService.instance = new SSENotificationService();
    }
    return SSENotificationService.instance;
  }

  /**
   * Send a notification to a specific user
   */
  public async notifyUser(
    userId: string,
    event: SSEEventType | string,
    data: any,
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<number> {
    try {
      const message: SSEMessage = {
        type: "event",
        event,
        data: {
          ...data,
          priority: options?.priority || "normal",
          timestamp: Date.now(),
        },
        target: "user",
        targetId: userId,
        timestamp: Date.now(),
      };

      const sentCount = await this.manager.sendToUser(
        userId,
        event,
        message.data,
      );

      // Also publish to Redis if enabled
      await this.manager.publishToRedis(message);

      logger.info("SSE-Notification", `Sent ${event} to user ${userId}`, {
        sentCount,
      });
      return sentCount;
    } catch (error) {
      logger.error(
        "SSE-Notification",
        `Failed to notify user ${userId}`,
        error,
      );
      return 0;
    }
  }

  /**
   * Send a notification to a specific session
   */
  public async notifySession(
    sessionId: string,
    event: SSEEventType | string,
    data: any,
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<number> {
    try {
      const message: SSEMessage = {
        type: "event",
        event,
        data: {
          ...data,
          priority: options?.priority || "normal",
          timestamp: Date.now(),
        },
        target: "session",
        targetId: sessionId,
        timestamp: Date.now(),
      };

      const sentCount = await this.manager.sendToSession(
        sessionId,
        event,
        message.data,
      );

      // Also publish to Redis if enabled
      await this.manager.publishToRedis(message);

      logger.info("SSE-Notification", `Sent ${event} to session ${sessionId}`, {
        sentCount,
      });
      return sentCount;
    } catch (error) {
      logger.error(
        "SSE-Notification",
        `Failed to notify session ${sessionId}`,
        error,
      );
      return 0;
    }
  }

  /**
   * Send a notification to a specific client
   */
  public async notifyClient(
    clientId: string,
    event: SSEEventType | string,
    data: any,
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<boolean> {
    try {
      const message: SSEMessage = {
        type: "event",
        event,
        data: {
          ...data,
          priority: options?.priority || "normal",
          timestamp: Date.now(),
        },
        target: "client",
        targetId: clientId,
        timestamp: Date.now(),
      };

      const sent = await this.manager.sendToClient(
        clientId,
        event,
        message.data,
      );

      // Also publish to Redis if enabled
      await this.manager.publishToRedis(message);

      logger.info("SSE-Notification", `Sent ${event} to client ${clientId}`, {
        sent,
      });
      return sent;
    } catch (error) {
      logger.error(
        "SSE-Notification",
        `Failed to notify client ${clientId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Broadcast a notification to all connected clients
   */
  public async broadcast(
    event: SSEEventType | string,
    data: any,
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<number> {
    try {
      const message: SSEMessage = {
        type: "event",
        event,
        data: {
          ...data,
          priority: options?.priority || "normal",
          timestamp: Date.now(),
        },
        target: "all",
        timestamp: Date.now(),
      };

      const sentCount = await this.manager.broadcast(event, message.data);

      // Also publish to Redis if enabled
      await this.manager.publishToRedis(message);

      logger.info("SSE-Notification", `Broadcasted ${event} to all clients`, {
        sentCount,
      });
      return sentCount;
    } catch (error) {
      logger.error(
        "SSE-Notification",
        "Failed to broadcast notification",
        error,
      );
      return 0;
    }
  }

  /**
   * Send a system alert to all users
   */
  public async sendSystemAlert(
    title: string,
    message: string,
    level: "info" | "warning" | "error" = "info",
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<number> {
    return this.broadcast(
      "system_alert",
      {
        title,
        message,
        level,
        id: `alert-${Date.now()}`,
      },
      options,
    );
  }

  /**
   * Send a status update to a user
   */
  public async sendStatusUpdate(
    userId: string,
    status: string,
    details?: any,
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<number> {
    return this.notifyUser(
      userId,
      "status_update",
      {
        status,
        details,
        id: `status-${Date.now()}`,
      },
      options,
    );
  }

  /**
   * Send a data sync notification
   */
  public async sendDataSync(
    userId: string,
    entity: string,
    action: "created" | "updated" | "deleted",
    entityId: string,
    data?: any,
    options?: { priority?: "low" | "normal" | "high" },
  ): Promise<number> {
    return this.notifyUser(
      userId,
      "data_sync",
      {
        entity,
        action,
        entityId,
        data,
        id: `sync-${Date.now()}`,
      },
      options,
    );
  }

  /**
   * Get current connection statistics
   */
  public getStats() {
    return this.manager.getStats();
  }

  /**
   * Check if a user has active connections
   */
  public hasUserConnections(userId: string): boolean {
    const clients = this.manager.getClientsByUser(userId);
    return clients.some((client) => client.isConnected);
  }

  /**
   * Get active client IDs for a user
   */
  public getUserClientIds(userId: string): string[] {
    const clients = this.manager.getClientsByUser(userId);
    return clients
      .filter((client) => client.isConnected)
      .map((client) => client.id);
  }
}

// Export singleton instance
export const sseNotifications = SSENotificationService.getInstance();
