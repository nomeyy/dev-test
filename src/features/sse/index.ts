/**
 * SSE (Server-Sent Events) Feature
 *
 * This module provides a centralized SSE manager for tracking active client connections per user.
 * It includes connection management, event broadcasting, and React hooks for client-side usage.
 */

// Core SSE manager
export { SSEManager, getSSEManager, destroySSEManager } from "./services";

// React hooks and components
export { useSSE } from "./hooks/useSSE";
export {
  SSEProvider,
  useSSEContext,
  useSSEStatus,
  useSSEEvents,
} from "./components/SSEProvider";
export { SSEDemo } from "./components/SSEDemo";

// Types
export type {
  SSEClientConnection,
  UserSSEStatus,
  SSEEventType,
  SSEEvent,
  UserSSEEvent,
  BroadcastSSEEvent,
  SSEConnectionContext,
  SSEManagerConfig,
  SSEManagerStats,
  SSEManagerService,
} from "./types";
