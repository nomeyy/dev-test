/**
 * Event handling helpers and utilities for SSE client
 * Provides typed event handlers and common event patterns
 */

import type { EventPayload } from "../types";
import type { SSEClient, SSEEventHandler } from "./sse-client";

/**
 * Typed event data for common event types
 */
export interface NotificationEvent {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  data?: any;
}

export interface UserUpdateEvent {
  userId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export interface SystemEvent {
  type: "maintenance" | "update" | "alert";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  metadata?: any;
}

export interface ChatMessageEvent {
  messageId: string;
  senderId: string;
  recipientId?: string;
  content: string;
  timestamp: string;
  metadata?: {
    edited?: boolean;
    replyTo?: string;
  };
}

/**
 * Event handler builder for typed events
 */
export class SSEEventHandlers {
  private client: SSEClient;

  constructor(client: SSEClient) {
    this.client = client;
  }

  /**
   * Handle notification events with typed data
   */
  onNotification(handler: (notification: NotificationEvent) => void): void {
    this.client.on<EventPayload>("notification", (payload) => {
      try {
        const notification = this.validateNotificationEvent(payload.data);
        handler(notification);
      } catch (error) {
        console.error("Invalid notification event data:", error);
      }
    });
  }

  /**
   * Handle user update events
   */
  onUserUpdate(handler: (update: UserUpdateEvent) => void): void {
    this.client.on<EventPayload>("user-update", (payload) => {
      try {
        const update = this.validateUserUpdateEvent(payload.data);
        handler(update);
      } catch (error) {
        console.error("Invalid user update event data:", error);
      }
    });
  }

  /**
   * Handle system events
   */
  onSystemEvent(handler: (event: SystemEvent) => void): void {
    this.client.on<EventPayload>("system", (payload) => {
      try {
        const systemEvent = this.validateSystemEvent(payload.data);
        handler(systemEvent);
      } catch (error) {
        console.error("Invalid system event data:", error);
      }
    });
  }

  /**
   * Handle chat message events
   */
  onChatMessage(handler: (message: ChatMessageEvent) => void): void {
    this.client.on<EventPayload>("chat-message", (payload) => {
      try {
        const message = this.validateChatMessageEvent(payload.data);
        handler(message);
      } catch (error) {
        console.error("Invalid chat message event data:", error);
      }
    });
  }

  /**
   * Handle custom events with validation
   */
  onCustomEvent<T>(
    eventName: string,
    validator: (data: any) => T,
    handler: (data: T) => void,
  ): void {
    this.client.on<EventPayload>(eventName, (payload) => {
      try {
        const validatedData = validator(payload.data);
        handler(validatedData);
      } catch (error) {
        console.error(`Invalid ${eventName} event data:`, error);
      }
    });
  }

  /**
   * Validate notification event data
   */
  private validateNotificationEvent(data: any): NotificationEvent {
    if (!data || typeof data !== "object") {
      throw new Error("Notification data must be an object");
    }

    const { title, message, type, timestamp } = data;

    if (!title || typeof title !== "string") {
      throw new Error("Notification title must be a string");
    }

    if (!message || typeof message !== "string") {
      throw new Error("Notification message must be a string");
    }

    if (!type || !["info", "success", "warning", "error"].includes(type)) {
      throw new Error(
        "Notification type must be one of: info, success, warning, error",
      );
    }

    if (!timestamp || typeof timestamp !== "string") {
      throw new Error("Notification timestamp must be a string");
    }

    return { title, message, type, timestamp, data: data.data };
  }

  /**
   * Validate user update event data
   */
  private validateUserUpdateEvent(data: any): UserUpdateEvent {
    if (!data || typeof data !== "object") {
      throw new Error("User update data must be an object");
    }

    const { userId, field, oldValue, newValue, timestamp } = data;

    if (!userId || typeof userId !== "string") {
      throw new Error("User ID must be a string");
    }

    if (!field || typeof field !== "string") {
      throw new Error("Field name must be a string");
    }

    if (!timestamp || typeof timestamp !== "string") {
      throw new Error("Timestamp must be a string");
    }

    return { userId, field, oldValue, newValue, timestamp };
  }

  /**
   * Validate system event data
   */
  private validateSystemEvent(data: any): SystemEvent {
    if (!data || typeof data !== "object") {
      throw new Error("System event data must be an object");
    }

    const { type, message, severity, timestamp } = data;

    if (!type || !["maintenance", "update", "alert"].includes(type)) {
      throw new Error(
        "System event type must be one of: maintenance, update, alert",
      );
    }

    if (!message || typeof message !== "string") {
      throw new Error("System event message must be a string");
    }

    if (
      !severity ||
      !["low", "medium", "high", "critical"].includes(severity)
    ) {
      throw new Error(
        "System event severity must be one of: low, medium, high, critical",
      );
    }

    if (!timestamp || typeof timestamp !== "string") {
      throw new Error("Timestamp must be a string");
    }

    return { type, message, severity, timestamp, metadata: data.metadata };
  }

  /**
   * Validate chat message event data
   */
  private validateChatMessageEvent(data: any): ChatMessageEvent {
    if (!data || typeof data !== "object") {
      throw new Error("Chat message data must be an object");
    }

    const { messageId, senderId, recipientId, content, timestamp } = data;

    if (!messageId || typeof messageId !== "string") {
      throw new Error("Message ID must be a string");
    }

    if (!senderId || typeof senderId !== "string") {
      throw new Error("Sender ID must be a string");
    }

    if (recipientId && typeof recipientId !== "string") {
      throw new Error("Recipient ID must be a string if provided");
    }

    if (!content || typeof content !== "string") {
      throw new Error("Message content must be a string");
    }

    if (!timestamp || typeof timestamp !== "string") {
      throw new Error("Timestamp must be a string");
    }

    return {
      messageId,
      senderId,
      recipientId,
      content,
      timestamp,
      metadata: data.metadata,
    };
  }
}

/**
 * Event debouncing utility for high-frequency events
 */
export class EventDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Debounce an event handler
   */
  debounce<T>(
    key: string,
    handler: (data: T) => void,
    delay: number,
  ): (data: T) => void {
    return (data: T) => {
      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        handler(data);
        this.timers.delete(key);
      }, delay);

      this.timers.set(key, timer);
    };
  }

  /**
   * Clear all debounced timers
   */
  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Clear specific debounced timer
   */
  clearKey(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

/**
 * Event batching utility for processing multiple events together
 */
export class EventBatcher<T> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private handler: (batch: T[]) => void;
  private delay: number;

  constructor(handler: (batch: T[]) => void, delay: number = 100) {
    this.handler = handler;
    this.delay = delay;
  }

  /**
   * Add event to batch
   */
  add(event: T): void {
    this.batch.push(event);

    // Clear existing timer
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Set new timer to process batch
    this.timer = setTimeout(() => {
      this.processBatch();
    }, this.delay);
  }

  /**
   * Process current batch immediately
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.processBatch();
  }

  /**
   * Process the current batch
   */
  private processBatch(): void {
    if (this.batch.length > 0) {
      const currentBatch = [...this.batch];
      this.batch = [];
      this.handler(currentBatch);
    }
    this.timer = null;
  }
}

/**
 * Event filtering utility
 */
export class EventFilter {
  /**
   * Filter events by user ID
   */
  static forUser(userId: string): (payload: EventPayload) => boolean {
    return (payload) => {
      return payload.metadata?.userId === userId;
    };
  }

  /**
   * Filter events by event type
   */
  static byType(eventType: string): (payload: EventPayload) => boolean {
    return (payload) => {
      return payload.type === eventType;
    };
  }

  /**
   * Filter events by timestamp range
   */
  static byTimeRange(
    startTime: Date,
    endTime: Date,
  ): (payload: EventPayload) => boolean {
    return (payload) => {
      const eventTime = new Date(payload.timestamp);
      return eventTime >= startTime && eventTime <= endTime;
    };
  }

  /**
   * Combine multiple filters with AND logic
   */
  static and(
    ...filters: Array<(payload: EventPayload) => boolean>
  ): (payload: EventPayload) => boolean {
    return (payload) => {
      return filters.every((filter) => filter(payload));
    };
  }

  /**
   * Combine multiple filters with OR logic
   */
  static or(
    ...filters: Array<(payload: EventPayload) => boolean>
  ): (payload: EventPayload) => boolean {
    return (payload) => {
      return filters.some((filter) => filter(payload));
    };
  }
}
