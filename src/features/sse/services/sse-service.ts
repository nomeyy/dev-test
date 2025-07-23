import type { SSEServiceType, SSEEvent, SSERedisMessage } from "../types";
import { SSEManager } from "./sse-manager";

/**
 * SSE Service implementation
 * Provides a clean API for backend modules to send notifications
 */
export class SSEService implements SSEServiceType {
  private manager: SSEManager;

  constructor(manager: SSEManager) {
    this.manager = manager;
  }

  /**
   * Send a notification to a specific user
   */
  async sendNotification(
    userId: string, 
    title: string, 
    message: string, 
    level: "info" | "success" | "warning" | "error" = "info",
    actionUrl?: string
  ): Promise<boolean> {
    const event: SSEEvent = {
      type: "notification",
      data: {
        title,
        message,
        level,
        actionUrl,
      },
      timestamp: Date.now(),
    };

    const success = this.manager.sendToUser(userId, event);
    
    // Send cross-instance message if Redis is enabled
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "user",
        targetId: userId,
        event,
      });
    }

    return success;
  }

  /**
   * Send a user update event to a specific user
   */
  async sendUserUpdate(userId: string, field: string, value: any): Promise<boolean> {
    const event: SSEEvent = {
      type: "user_update",
      data: {
        userId,
        field,
        value,
      },
      timestamp: Date.now(),
    };

    const success = this.manager.sendToUser(userId, event);
    
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "user",
        targetId: userId,
        event,
      });
    }

    return success;
  }

  /**
   * Send a reel upload update to a specific user
   */
  async sendReelUpdate(
    userId: string, 
    reelId: string, 
    status: "processing" | "completed" | "failed", 
    progress?: number, 
    error?: string
  ): Promise<boolean> {
    const event: SSEEvent = {
      type: "reel_upload",
      data: {
        reelId,
        status,
        progress,
        error,
      },
      timestamp: Date.now(),
    };

    const success = this.manager.sendToUser(userId, event);
    
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "user",
        targetId: userId,
        event,
      });
    }

    return success;
  }

  /**
   * Send search results to a specific user
   */
  async sendSearchResult(userId: string, query: string, results: any[], total: number): Promise<boolean> {
    const event: SSEEvent = {
      type: "search_result",
      data: {
        query,
        results,
        total,
      },
      timestamp: Date.now(),
    };

    const success = this.manager.sendToUser(userId, event);
    
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "user",
        targetId: userId,
        event,
      });
    }

    return success;
  }

  /**
   * Send a system message to a specific user
   */
  async sendSystemMessage(userId: string, message: string, code?: string): Promise<boolean> {
    const event: SSEEvent = {
      type: "system_message",
      data: {
        message,
        code,
      },
      timestamp: Date.now(),
    };

    const success = this.manager.sendToUser(userId, event);
    
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "user",
        targetId: userId,
        event,
      });
    }

    return success;
  }

  /**
   * Send an event to all clients subscribed to a specific channel
   */
  async sendToChannel(channel: string, event: SSEEvent): Promise<boolean> {
    const success = this.manager.sendToChannel(channel, event);
    
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "channel",
        targetId: channel,
        event,
      });
    }

    return success;
  }

  /**
   * Broadcast an event to all connected clients
   */
  async broadcast(event: SSEEvent): Promise<void> {
    this.manager.broadcast(event);
    
    await this.sendCrossInstanceMessage({
      type: "sse_event",
      target: "broadcast",
      event,
    });
  }

  /**
   * Send a custom event to a specific user
   */
  async sendCustomEvent(userId: string, eventType: string, data: Record<string, any>): Promise<boolean> {
    const event: SSEEvent = {
      type: eventType as any, // Cast to allow custom event types
      data,
      timestamp: Date.now(),
    };

    const success = this.manager.sendToUser(userId, event);
    
    if (success) {
      await this.sendCrossInstanceMessage({
        type: "sse_event",
        target: "user",
        targetId: userId,
        event,
      });
    }

    return success;
  }

  /**
   * Send a ping event to a specific user (useful for testing connections)
   */
  async sendPing(userId: string): Promise<boolean> {
    const event: SSEEvent = {
      type: "ping",
      data: {
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.manager.sendToUser(userId, event);
  }

  /**
   * Get the number of active connections
   */
  getActiveConnections(): number {
    return this.manager.getActiveConnections();
  }

  /**
   * Get the SSE manager instance (for advanced usage)
   */
  getManager(): SSEManager {
    return this.manager;
  }

  /**
   * Send cross-instance message via Redis
   */
  private async sendCrossInstanceMessage(message: Omit<SSERedisMessage, 'instanceId' | 'timestamp'>): Promise<void> {
    try {
      await this.manager.sendCrossInstanceMessage(message);
    } catch (error) {
      console.error("Failed to send cross-instance message:", error);
    }
  }
} 