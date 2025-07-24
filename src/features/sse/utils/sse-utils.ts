import { sseService } from "@/lib/sse";
import { logger } from "@/utils/logging";
import { createErrorHandler } from "@/utils/error-handlers";
import type { SSEMessage } from "@/lib/sse";

const errorHandler = createErrorHandler("SSE");
const log = logger.createContextLogger("SSE");

/**
 * Functions to handle backend requests for sending SSE events.
 *
 */

/**
 * Send a message to a specific user.
 *
 * @param userId - The user ID to send the message to
 * @param event - The event type (e.g., 'message')
 * @param data - The data payload to send
 *
 * @example
 * ```typescript
 * await sendUserMessage('user:id-1', 'message', {
 *   title: 'New Message',
 *   message: 'You have a new message from John',
 *   type: 'info'
 * });
 * ```
 */
export async function sendUserMessage(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await sseService.sendToUser(userId, event, data);
    log.info(`Sent message to user ${userId}`, { event, data });
  } catch (error) {
    errorHandler("send user message", error);
  }
}

/**
 * Send a message for all active connections.
 *
 * @param event - Event type
 * @param data - Data payload
 * @param exclude - Array of client IDs to exclude from the broadcast
 *
 * @example
 * ```typescript
 * await sendToAllMessage('system', {
 *   message: 'System maintenance in 5 minutes',
 *   type: 'warning'
 * });
 * ```
 */
export async function sendToAllMessage(
  event: string,
  data: Record<string, unknown>,
  exclude: string[] = [],
): Promise<void> {
  try {
    await sseService.sendToAll(event, data, exclude);
    log.info("Broadcasted message", {
      event,
      data,
      excludeCount: exclude.length,
    });
  } catch (error) {
    errorHandler("sendToAll message", error);
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
