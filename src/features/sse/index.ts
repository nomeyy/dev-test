/**
 * Public API for the SSE (Server-Sent Events) module.
 * This file exports the components, services, and utilities that should be
 * accessible to other parts of the application.
 */

// Export the main SSE manager singleton
export { sseManager } from "./services/sse-manager";

// Export notification service and utilities
export {
  SSENotificationService,
  notifyUser,
  notifyUsers,
  broadcast,
  notifyVideoProcessing,
} from "./services/notification-service";

// Export client-side hooks and utilities
export { useSSE, withSSE } from "./hooks/useSSE";
export type {
  SSEEventHandler,
  SSEStatus,
  UseSSEOptions,
  WithSSEProps,
} from "./hooks/useSSE";

// Export types for external consumption
export type {
  SSEEvent,
  SSEClient,
  SSEConnectionOptions,
  SSEManagerConfig,
  BroadcastOptions,
} from "./types";

// Export system events enum for external use
export { SSESystemEvents } from "./types";
