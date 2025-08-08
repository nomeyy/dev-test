// Server-side exports
export { getSSEManager, shutdownSSEManager } from "./services/sse-manager";
export {
  sendSSEEvent,
  sendNotificationToUser,
  broadcastNotification,
  sendNotificationToClients,
  SSENotifications,
} from "./utils/dispatcher";

// Client-side exports
export { useSSE } from "./hooks/useSSE";

// Type exports
export type {
  SSEClient,
  SSEMessage,
  SSEEvent,
  SSEManagerOptions,
  SSEEventHandler,
  SSEStats,
} from "./types";

export type { SSEOptions, SSEState, SSEHandlers } from "./hooks/useSSE";
