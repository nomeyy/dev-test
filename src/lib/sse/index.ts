/**
 * @fileoverview SSE Library Index
 *
 * This module exports the centralized SSE manager and related utilities.
 * It provides a clean API for other parts of the application to integrate
 * with the SSE system without managing connection details.
 *
 * @example
 * ```typescript
 * import { sseManager } from '@/lib/sse';
 *
 * // Send message to specific user
 * sseManager.send(userId, 'notification', { message: 'Hello!' });
 *
 * // Broadcast to all connected clients
 * sseManager.broadcast('system-alert', { alert: 'Maintenance' });
 * ```
 */

import { SSEManager } from "./SSEManager";

export { SSEManager } from "./SSEManager";

// Create and export singleton instance
export const sseManager = new SSEManager();
