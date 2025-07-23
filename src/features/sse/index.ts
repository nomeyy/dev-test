/**
 * Public API for the SSE module.
 * This file exports only the components, services, utilities and types that should be
 * accessible to other parts of the application.
 */

// SSE Manager service
export { getSSEManager, SSEManager } from "./services/sse-manager";

// SSE Notification service
export {
  SSENotificationService,
  sseNotifications,
} from "./services/sse-notification-service";

// Server actions
export {
  sendTestNotification,
  sendSystemAlert,
  sendStatusUpdate,
  sendDataSyncNotification,
  getSSEStats,
  checkUserConnections,
} from "./actions/sse-actions";

// React hooks
export { useSSE } from "./hooks/useSSE";
export type { SSEConnectionState, SSEHookOptions } from "./hooks/useSSE";

// React components
export { SSEMessageDisplay } from "./components/SSEMessageDisplay";

// Types
export type {
  SSEClient,
  SSEEvent,
  SSEConnectionOptions,
  SSEManagerConfig,
  SSEMessage,
  SSEClientStats,
  SSEEventType,
  SSEError,
} from "./types";
