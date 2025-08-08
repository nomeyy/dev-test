import { notificationManager } from "./manager";
import { NotificationType, type NotificationEvent } from "../types";

// Re-export the manager instance
export { notificationManager };

// Re-export utilities
export { registerModule } from "./register";
export { setupMockEvents, configureTargetSelector, startMockEvents, stopMockEvents } from "./mock";

/**
 * Unified notification service that combines the best of both approaches.
 * Provides a clean API for sending notifications while leveraging the robust
 * SSE manager underneath.
 */
export const notificationsService = {
  /**
   * Subscribe a client to notifications (handled by manager)
   */
  subscribe: (id: string) => notificationManager.subscribe(id),

  /**
   * Send notification to all subscribers or specific ones
   */
  notify: (subIds: string[], message?: string) => {
    notificationManager.notify(subIds, message);
  },

  /**
   * Send notification to all connected clients
   */
  notifyAll: (event: string, data: NotificationEvent) => {
    notificationManager.broadcast(event, data);
  },

  /**
   * Send notification to a specific client
   */
  notifyClient: (clientId: string, event: string, data: NotificationEvent) => {
    notificationManager.send(clientId, event, data);
  },

  /**
   * Send notification to multiple specific clients
   */
  notifyMany: (clientIds: string[], event: string, data: NotificationEvent) => {
    notificationManager.sendMany(clientIds, event, data);
  },

  /**
   * Get current client count
   */
  getClientCount: () => notificationManager.getClientCount(),

  /**
   * Get all connected client IDs
   */
  getClientIds: () => notificationManager.getClientIds(),

  /**
   * Register event listeners for connect/disconnect
   */
  on: (event: "connect" | "disconnect", listener: (clientId: string) => void) => {
    return notificationManager.on(event, listener);
  },
} as const;