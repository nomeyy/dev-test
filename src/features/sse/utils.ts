import { sseManager } from './SSEManager';

/**
 * Send a named SSE event with payload to a specific user.
 */
export function sendSSEToUser(userId: string, event: string, payload: unknown) {
  sseManager.sendEvent(userId, event, payload);
}

/**
 * Broadcast a named SSE event with payload to all connected users.
 */
export function broadcastSSE(event: string, payload: unknown) {
  sseManager.broadcastEvent(event, payload);
} 