/**
 * SSE Feature Exports
 * -------------------
 * Main entry point for the SSE feature module
 */

// Types
export type * from "./types";

// Services
export {
  SSEManager,
  getSSEManager,
  shutdownSSEManager,
} from "./services/sse-manager";

// Client utilities
export { SSEClient, createSSEClient } from "./utils/sse-client";

// Backend integration helpers
export * from "./utils/backend-integration";

// React hooks
export { useSSE, useSSENotifications, useSSEMessages } from "./hooks/useSSE";

// Components (for testing)
export { SSETestPanel, SSEStatusIndicator } from "./components";
