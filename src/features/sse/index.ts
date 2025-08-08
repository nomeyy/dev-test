/**
 * SSE Feature - Real-time Server-Sent Events
 *
 * This module provides a complete SSE (Server-Sent Events) implementation
 * for real-time client-server communication.
 *
 * @example Basic Usage (Server-side)
 * ```typescript
 * import { notifyUser, broadcastEvent } from '@/features/sse';
 *
 * // Send notification to a specific user
 * await notifyUser('user123', 'Welcome!', 'Your account has been created', 'success');
 *
 * // Broadcast to all connected clients
 * await broadcastEvent({
 *   event: 'system_update',
 *   data: { message: 'System maintenance scheduled' }
 * });
 * ```
 *
 * @example Client-side (Browser)
 * ```typescript
 * // Connect to general SSE endpoint
 * const eventSource = new EventSource('/api/sse');
 *
 * // Listen for notifications
 * eventSource.addEventListener('notification', (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Notification:', data.title, data.message);
 * });
 *
 * // Connect to specific channel
 * const channelSource = new EventSource('/api/sse/notifications');
 * ```
 */

// Core Services - Use global singleton from lib
export { getSSEService, resetGlobalSSEService } from "@/lib/sse";

// Server-side Utilities - For future implementation
// Currently using direct API endpoints for messaging

// Message Formatting Utilities
export {
  formatSSEMessage,
  createHeartbeatEvent,
  createNotificationEvent,
  createCustomEvent,
  createUserUpdateEvent,
  createSystemMessageEvent,
  isValidSSEEvent,
  sanitizeEventData,
} from "./utils/message-formatter";

// Service Context Utilities - For future implementation

// Types
export type {
  SSEEvent,
  SSEConnection,
  SSEConfig,
  SSEServiceType,
  BroadcastOptions,
  ConnectionMetrics,
  Channel,
  EventName,
  SSEEventHandler,
  ConnectionEventHandler,
} from "./types";

// Schemas
export { SSEEventSchema, ChannelSchema, EventNameSchema } from "./types";

// Constants
export { REDIS_CHANNELS, REDIS_KEYS } from "./types";

// Error Classes
export { SSEError } from "./types";
