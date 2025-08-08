// Export SSE types
export type {
  SSEEventType,
  SSEEventData,
  SSEEvent,
  SSEClient,
  SendEventOptions,
  SSEManager,
  SSEService,
} from "./types";

// Export SSE manager (for advanced usage)
export { sseManager } from "./manager";

// Import for re-exporting individual functions
import { sseService, sseUtils } from "./service";

// Export SSE service (recommended for most use cases)
export { sseService, sseUtils } from "./service";

// Re-export commonly used functions for convenience
export const sendNotification = sseService.sendNotification;
export const sendCustomEvent = sseService.sendCustomEvent;
export const broadcastNotification = sseService.broadcastNotification;

export const sendError = sseUtils.sendError;
export const sendSuccess = sseUtils.sendSuccess;
export const sendMaintenanceNotification = sseUtils.sendMaintenanceNotification;
export const getStats = sseUtils.getStats;
