import { realtimeService } from "../services/realtime-service";
import type { RealtimeEvent, RealtimePublishOptions } from "../types";

/**
 * Utility functions for backend modules to easily send realtime events
 * without needing to import the realtime service directly
 */

// Common realtime event patterns
export const publishToUser = {
  /**
   * Send success event to specific user
   */
  success: async (userId: string, title: string, message?: string) => {
    return realtimeService.sendSuccessEvent(title, message, { userId });
  },

  /**
   * Send error event to specific user
   */
  error: async (userId: string, title: string, message?: string) => {
    return realtimeService.sendErrorEvent(title, message, { userId });
  },

  /**
   * Send info event to specific user
   */
  info: async (userId: string, title: string, message?: string) => {
    return realtimeService.sendInfoEvent(title, message, { userId });
  },

  /**
   * Send warning event to specific user
   */
  warning: async (userId: string, title: string, message?: string) => {
    return realtimeService.sendWarningEvent(title, message, { userId });
  },
};

// Broadcast realtime events
export const publishToAll = {
  /**
   * Send success event to all connected users
   */
  success: async (title: string, message?: string) => {
    return realtimeService.sendSuccessEvent(title, message, {
      broadcast: true,
    });
  },

  /**
   * Send error event to all connected users
   */
  error: async (title: string, message?: string) => {
    return realtimeService.sendErrorEvent(title, message, { broadcast: true });
  },

  /**
   * Send info event to all connected users
   */
  info: async (title: string, message?: string) => {
    return realtimeService.sendInfoEvent(title, message, { broadcast: true });
  },

  /**
   * Send warning event to all connected users
   */
  warning: async (title: string, message?: string) => {
    return realtimeService.sendWarningEvent(title, message, {
      broadcast: true,
    });
  },
};

// Advanced realtime event patterns
export const publishAdvanced = {
  /**
   * Send custom event with full control
   */
  custom: async (
    event: Omit<RealtimeEvent, "id" | "timestamp">,
    options: RealtimePublishOptions = {},
  ) => {
    return realtimeService.publishEvent(event, options);
  },

  /**
   * Send event when a process completes
   */
  processComplete: async (
    userId: string,
    processName: string,
    success: boolean,
    details?: string,
  ) => {
    if (success) {
      return publishToUser.success(
        userId,
        `${processName} Complete`,
        details ?? `${processName} completed successfully`,
      );
    } else {
      return publishToUser.error(
        userId,
        `${processName} Failed`,
        details ?? `${processName} encountered an error`,
      );
    }
  },

  /**
   * Send system maintenance event to all users
   */
  systemMaintenance: async (message: string, isStart = true) => {
    return publishToAll.warning(
      isStart ? "System Maintenance Started" : "System Maintenance Complete",
      message,
    );
  },

  /**
   * Send welcome event to new user
   */
  welcome: async (userId: string, userName: string) => {
    return publishToUser.info(
      userId,
      "Welcome!",
      `Welcome to the platform, ${userName}! 🎉`,
    );
  },
};
