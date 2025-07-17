import { sseService } from "@/lib/sse";
import { logger } from "@/utils/logging";
import { createErrorHandler } from "@/utils/error-handlers";
import type { SSEMessage } from "@/lib/sse";

const errorHandler = createErrorHandler("SSE");
const log = logger.createContextLogger("SSE");

/**
 * Utility functions for sending SSE events from backend modules.
 *
 * These functions provide a clean interface for other parts of the application
 * to send real-time notifications without managing SSE protocol details.
 */

/**
 * Send a notification to a specific user.
 *
 * @param userId - The user ID to send the notification to
 * @param event - The event type (e.g., 'notification', 'update', 'alert')
 * @param data - The data payload to send
 *
 * @example
 * ```typescript
 * await sendUserNotification('user123', 'notification', {
 *   title: 'New Message',
 *   message: 'You have a new message from John',
 *   type: 'info'
 * });
 * ```
 */
export async function sendUserNotification(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await sseService.sendToUser(userId, event, data);
    log.info(`Sent notification to user ${userId}`, { event, data });
  } catch (error) {
    errorHandler("send user notification", error);
  }
}

/**
 * Broadcast a message to all connected clients.
 *
 * @param event - The event type
 * @param data - The data payload to send
 * @param exclude - Array of client IDs to exclude from the broadcast
 *
 * @example
 * ```typescript
 * await broadcastMessage('system', {
 *   message: 'System maintenance in 5 minutes',
 *   type: 'warning'
 * });
 * ```
 */
export async function broadcastMessage(
  event: string,
  data: Record<string, unknown>,
  exclude: string[] = [],
): Promise<void> {
  try {
    await sseService.broadcast(event, data, exclude);
    log.info("Broadcasted message", {
      event,
      data,
      excludeCount: exclude.length,
    });
  } catch (error) {
    errorHandler("broadcast message", error);
  }
}

/**
 * Send a message to specific clients by their IDs.
 *
 * @param clientIds - Array of client IDs to send the message to
 * @param event - The event type
 * @param data - The data payload to send
 *
 * @example
 * ```typescript
 * await sendToClients(['client1', 'client2'], 'update', {
 *   status: 'ready'
 * });
 * ```
 */
export async function sendToClients(
  clientIds: string[],
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const message: SSEMessage = {
      event,
      data,
      target: clientIds,
    };
    await sseService.sendMessage(message);
    log.info(`Sent message to ${clientIds.length} clients`, { event, data });
  } catch (error) {
    errorHandler("send to clients", error);
  }
}

/**
 * Get the current number of connected clients.
 *
 * @returns The number of active SSE connections
 *
 * @example
 * ```typescript
 * const clientCount = getClientCount();
 * console.log(`Currently ${clientCount} clients connected`);
 * ```
 */
export function getClientCount(): number {
  return sseService.getClientCount();
}

/**
 * Get information about all active clients.
 *
 * @returns Array of active client information
 *
 * @example
 * ```typescript
 * const clients = getActiveClients();
 * console.log('Active clients:', clients.map(c => ({ id: c.id, userId: c.userId })));
 * ```
 */
export function getActiveClients() {
  return sseService.getActiveClients();
}
