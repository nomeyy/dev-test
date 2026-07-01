// lib/sse/index.ts
import {
  sendToClient,
  broadcastEvent,
  clients,
  getConnections,
} from "@/app/api/sse/route";
import { logger } from "@/utils/logging";

export interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ClientConnection {
  clientId: string;
  userId?: string;
  username?: string;
  connectedAt: string;
  lastActive: number;
}

export interface ConnectionStats {
  total: number;
  clients: ClientConnection[];
  activeUsers: Set<string>;
}

export class SSEManager {
  /**
   * Send an event to a specific client
   */
  static sendToClient(
    clientId: string,
    event: string,
    data: any,
    metadata?: Record<string, any>,
  ): boolean {
    try {
      const eventData: SSEEvent = {
        type: event,
        data,
        timestamp: new Date().toISOString(),
        metadata,
      };

      sendToClient(clientId, eventData);
      logger.info("SSE", "Event sent to client", {
        clientId,
        event,
        success: true,
      });
      return true;
    } catch (error) {
      logger.error("SSE", "Failed to send event to client", {
        clientId,
        event,
        error,
      });
      return false;
    }
  }

  /**
   * Send an event to a specific user (across all their connections)
   */
  static sendToUser(
    userId: string,
    event: string,
    data: any,
    metadata?: Record<string, any>,
  ): number {
    try {
      let sentCount = 0;
      const userClients = Array.from(clients.entries()).filter(
        ([_, client]) => client.userId === userId,
      );

      userClients.forEach(([clientId, _]) => {
        if (this.sendToClient(clientId, event, data, metadata)) {
          sentCount++;
        }
      });

      logger.info("SSE", "Event sent to user", {
        userId,
        event,
        sentCount,
        totalClients: userClients.length,
      });
      return sentCount;
    } catch (error) {
      logger.error("SSE", "Failed to send event to user", {
        userId,
        event,
        error,
      });
      return 0;
    }
  }

  /**
   * Send an event to clients in a specific channel/room
   */
  static sendToChannel(
    channel: string,
    event: string,
    data: any,
    metadata?: Record<string, any>,
  ): number {
    try {
      // For now, broadcast to all clients
      // TODO: Implement channel-based routing
      const eventData: SSEEvent = {
        type: event,
        data: { ...data, channel },
        timestamp: new Date().toISOString(),
        metadata: { ...metadata, channel },
      };

      broadcastEvent(event, eventData);
      const totalClients = clients.size;
      logger.info("SSE", "Event sent to channel", {
        channel,
        event,
        totalClients,
      });
      return totalClients;
    } catch (error) {
      logger.error("SSE", "Failed to send event to channel", {
        channel,
        event,
        error,
      });
      return 0;
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  static broadcast(
    event: string,
    data: any,
    metadata?: Record<string, any>,
  ): number {
    try {
      const eventData: SSEEvent = {
        type: event,
        data,
        timestamp: new Date().toISOString(),
        metadata,
      };

      broadcastEvent(event, eventData);
      const totalClients = clients.size;
      logger.info("SSE", "Event broadcasted", { event, totalClients });
      return totalClients;
    } catch (error) {
      logger.error("SSE", "Failed to broadcast event", { event, error });
      return 0;
    }
  }

  /**
   * Send a notification to a specific client
   */
  static notifyClient(
    clientId: string,
    message: string,
    metadata?: Record<string, any>,
  ): boolean {
    return this.sendToClient(clientId, "notification", { message }, metadata);
  }

  /**
   * Send a notification to a specific user
   */
  static notifyUser(
    userId: string,
    message: string,
    metadata?: Record<string, any>,
  ): number {
    return this.sendToUser(userId, "notification", { message }, metadata);
  }

  /**
   * Send a system notification
   */
  static sendSystemNotification(
    type: string,
    data: any,
    target: "all" | "channel" | "user" | "client" = "all",
    targetId?: string,
  ): boolean | number {
    const metadata = {
      ...data.metadata,
      system: true,
      source: "system",
    };

    switch (target) {
      case "client":
        if (!targetId)
          throw new Error(
            "Client ID required for client-targeted notifications",
          );
        return this.sendToClient(targetId, type, data, metadata);

      case "user":
        if (!targetId)
          throw new Error("User ID required for user-targeted notifications");
        return this.sendToUser(targetId, type, data, metadata);

      case "channel":
        if (!targetId)
          throw new Error(
            "Channel name required for channel-targeted notifications",
          );
        return this.sendToChannel(targetId, type, data, metadata);

      case "all":
      default:
        return this.broadcast(type, data, metadata);
    }
  }

  /**
   * Send a webhook notification
   */
  static sendWebhookNotification(
    webhookType: string,
    data: any,
    target: "all" | "channel" | "user" | "client" = "all",
    targetId?: string,
  ): boolean | number {
    const metadata = {
      ...data.metadata,
      webhook: true,
      webhookType,
      source: "webhook",
    };

    return this.sendSystemNotification(webhookType, data, target, targetId);
  }

  /**
   * Send a job completion notification
   */
  static sendJobNotification(
    jobId: string,
    status: "started" | "completed" | "failed" | "progress",
    data: any,
    target: "all" | "channel" | "user" | "client" = "all",
    targetId?: string,
  ): boolean | number {
    const metadata = {
      ...data.metadata,
      job: true,
      jobId,
      status,
      source: "job-processor",
    };

    return this.sendSystemNotification(`job:${status}`, data, target, targetId);
  }

  /**
   * Send a real-time update notification
   */
  static sendRealtimeUpdate(
    entityType: string,
    entityId: string,
    action: "created" | "updated" | "deleted",
    data: any,
    target: "all" | "channel" | "user" | "client" = "all",
    targetId?: string,
  ): boolean | number {
    const metadata = {
      ...data.metadata,
      realtime: true,
      entityType,
      entityId,
      action,
      source: "realtime-update",
    };

    return this.sendSystemNotification(
      `realtime:${entityType}:${action}`,
      data,
      target,
      targetId,
    );
  }

  /**
   * Send a user activity notification
   */
  static sendUserActivityNotification(
    userId: string,
    activityType: string,
    data: any,
    target: "all" | "channel" | "user" | "client" = "all",
    targetId?: string,
  ): boolean | number {
    const metadata = {
      ...data.metadata,
      userActivity: true,
      activityType,
      source: "user-activity",
    };

    return this.sendSystemNotification(
      `user:${activityType}`,
      data,
      target,
      targetId,
    );
  }

  /**
   * Get current connection statistics
   */
  static getConnections(): ConnectionStats {
    try {
      const stats = getConnections();
      const activeUsers = new Set<string>();

      clients.forEach((client) => {
        if (client.userId) {
          activeUsers.add(client.userId);
        }
      });

      return {
        total: stats.total,
        clients: Array.from(clients.entries()).map(([clientId, client]) => ({
          clientId,
          userId: client.userId,
          username: client.username,
          connectedAt: new Date(client.lastActive - 10000).toISOString(), // Approximate
          lastActive: client.lastActive,
        })),
        activeUsers,
      };
    } catch (error) {
      logger.error("SSE", "Failed to get connection stats", { error });
      return { total: 0, clients: [], activeUsers: new Set() };
    }
  }

  /**
   * Check if a specific client is connected
   */
  static isClientConnected(clientId: string): boolean {
    return clients.has(clientId);
  }

  /**
   * Check if a specific user has any active connections
   */
  static isUserOnline(userId: string): boolean {
    return Array.from(clients.values()).some(
      (client) => client.userId === userId,
    );
  }

  /**
   * Get all clients for a specific user
   */
  static getUserClients(userId: string): string[] {
    return Array.from(clients.entries())
      .filter(([_, client]) => client.userId === userId)
      .map(([clientId, _]) => clientId);
  }

  /**
   * Disconnect a specific client
   */
  static disconnectClient(clientId: string): boolean {
    try {
      const client = clients.get(clientId);
      if (client) {
        client.controller.close();
        clients.delete(clientId);
        logger.info("SSE", "Client disconnected by server", { clientId });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("SSE", "Failed to disconnect client", { clientId, error });
      return false;
    }
  }

  /**
   * Disconnect all clients for a specific user
   */
  static disconnectUser(userId: string): number {
    try {
      const userClients = this.getUserClients(userId);
      let disconnectedCount = 0;

      userClients.forEach((clientId) => {
        if (this.disconnectClient(clientId)) {
          disconnectedCount++;
        }
      });

      logger.info("SSE", "All user clients disconnected", {
        userId,
        count: disconnectedCount,
      });
      return disconnectedCount;
    } catch (error) {
      logger.error("SSE", "Failed to disconnect user", { userId, error });
      return 0;
    }
  }
}

// Export utility functions for direct use
export const {
  sendToClient,
  sendToUser,
  sendToChannel,
  broadcast,
  notifyClient,
  notifyUser,
  sendSystemNotification,
  sendWebhookNotification,
  sendJobNotification,
  sendRealtimeUpdate,
  sendUserActivityNotification,
  getConnections,
  isClientConnected,
  isUserOnline,
  getUserClients,
  disconnectClient,
  disconnectUser,
} = SSEManager;
