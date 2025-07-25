/**
 * Public API for the SSE (Server-Sent Events) module.
 * This file exports components, services, and types that should be
 * accessible to other parts of the application.
 */

// Core SSE manager service
export { sseManager } from "./services/sse-manager";

// Backend integration utilities
export * from "./utils/backend-integration";

// Client-side hooks
export * from "./hooks/useSSE";

// Demo component
export { SSEDemo } from "./components/SSEDemo";

// Type definitions
export type {
  SSEEvent,
  SSEConnection,
  SendEventOptions,
  SSEManagerConfig,
  ConnectionStats,
  SSEBackend,
} from "./types";
