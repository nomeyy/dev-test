// Main SSE service exports
export { sseService, getSSEService } from "./services/sse-service";
export { getSSEConnectionManager } from "./services/sse-connection-manager";

// Components
export { SSEDemo } from "./components/SSEDemo";

// Utility functions for backend integration
export {
  notifyUser,
  alertUser,
  updateUser,
  systemBroadcast,
  sendUserEvent,
  sendSessionEvent,
  broadcastEvent,
  notifications,
  systemNotifications,
  integrations,
  getConnectionStats,
  getActiveConnectionCount,
} from "./utils/backend-utils";

// Types
export type {
  SSEEvent,
  SSEClient,
  SSENotificationEvent,
  SSEServiceType,
  SSEConnectionManager,
  SSEServiceOptions,
  HeartbeatConfig,
} from "./types";

// Schemas
export { SSEEventSchema, SSENotificationEventSchema } from "./types";
