// Core services
export { sseEventDispatcher } from "./services/event-dispatcher";
export { sseManager } from "./services/sse-manager";

// Utility functions for backend integration
export {
  broadcastSSEEvent,
  getSSEStats,
  hasActiveConnections,
  notifyProcessingComplete,
  notifyProcessingError,
  notifyProcessingStarted,
  notifyUploadComplete,
  notifyUploadError,
  notifyUploadProgress,
  notifyUser,
  sendCustomSSEEvent,
  sendSSEEvent,
} from "./utils/sse-utils";

// Public types
export type {
  SSEConnection,
  SSEConnectionResponse,
  SSEEvent,
  SSEEventResponse,
  SSEEventType,
  SSEManagerConfig,
} from "./types";

// Event type constants
export { SSE_EVENT_TYPES } from "./types";

// Validation schemas
export {
  SSEConnectionModel,
  SSEEventModel,
  SSEManagerConfigModel,
} from "./types";
