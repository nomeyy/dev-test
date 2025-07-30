/**
 * Server-Sent Events feature
 * Provides real-time, server-to-client communication capabilities
 */

// Services
export { sseService, SSEService } from "./services/sse-service";

// Utilities for backend integration
export {
  sendNotificationToUsers,
  broadcastNotification,
  sendVideoUploadProgress,
  sendVideoReady,
  sendUserUpdate,
  sendCustomEvent,
  getSSEStats,
} from "./utils/sse-utils";

// Client-side hooks
export { useSSE } from "./hooks/useSSE";

// Re-export types for convenience
export type {
  SSEEvent,
  SSEClient,
  SendEventOptions,
  SSEConfig,
  SSEServiceInterface,
  SSEEventType,
} from "@/types/sse";

export { SSE_EVENT_TYPES } from "@/types/sse";
