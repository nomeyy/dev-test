import { EventEmitter } from "events";
import type { RealtimeEvent, RealtimePublishOptions } from "../types";

// Global event emitter for realtime events
// TODO: Replace with Redis pub/sub for multi-instance scaling
const realtimeEmitter = new EventEmitter();
const REALTIME_EVENT = "realtime";

/**
 * Service for managing realtime events
 * Follows the same pattern as other services in the codebase
 */
export const realtimeService = {
  /**
   * Publish a realtime event that will be broadcast to subscribed clients
   */
  publishEvent: async (
    event: Omit<RealtimeEvent, "id" | "timestamp">,
    options: RealtimePublishOptions = {},
  ): Promise<void> => {
    const realtimeEvent: RealtimeEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: options.userId,
    };

    // Emit event to all subscribers
    realtimeEmitter.emit(REALTIME_EVENT, {
      event: realtimeEvent,
      options,
    });
  },

  /**
   * Subscribe to realtime events
   * Returns an unsubscribe function
   */
  subscribeToEvents: async (
    callback: (event: RealtimeEvent, options: RealtimePublishOptions) => void,
  ): Promise<() => void> => {
    const messageHandler = (data: {
      event: RealtimeEvent;
      options: RealtimePublishOptions;
    }) => {
      callback(data.event, data.options);
    };

    // Subscribe to events
    realtimeEmitter.on(REALTIME_EVENT, messageHandler);

    // Return unsubscribe function
    return () => {
      realtimeEmitter.off(REALTIME_EVENT, messageHandler);
    };
  },

  /**
   * Helper methods for common event types (maintaining notification compatibility)
   */
  sendInfoEvent: async (
    title: string,
    message?: string,
    options?: RealtimePublishOptions,
  ): Promise<void> => {
    return realtimeService.publishEvent(
      { type: "info", title, message },
      options,
    );
  },

  sendSuccessEvent: async (
    title: string,
    message?: string,
    options?: RealtimePublishOptions,
  ): Promise<void> => {
    return realtimeService.publishEvent(
      { type: "success", title, message },
      options,
    );
  },

  sendErrorEvent: async (
    title: string,
    message?: string,
    options?: RealtimePublishOptions,
  ): Promise<void> => {
    return realtimeService.publishEvent(
      { type: "error", title, message },
      options,
    );
  },

  sendWarningEvent: async (
    title: string,
    message?: string,
    options?: RealtimePublishOptions,
  ): Promise<void> => {
    return realtimeService.publishEvent(
      { type: "warning", title, message },
      options,
    );
  },
};
