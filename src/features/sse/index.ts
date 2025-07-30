// SSE Manager
export { sseManager } from "./services/sse-manager";

// Types
export type {
  SSEEvent,
  SSEClient,
  SSEMessage,
  SSEConnectionOptions,
  SSEManagerStats,
} from "./types";

// Utilities
export {
  broadcastSSEMessage,
  sendSSEMessageToUser,
  sendSSEMessageToSession,
  sendSSEMessageToClient,
  sendNotificationToUser,
  broadcastSystemUpdate,
} from "./utils/sse-utils";

// React Hooks
export { useSSE, useSSEEvent, useSSENotifications } from "./hooks/useSSE";
