/**
 * Public API for the SSE (Server-Sent Events) module.
 * This file exports components, hooks, services and types for real-time notifications.
 */

// Core SSE service for backend integration
export { SSEManager, sseManager } from "./services/sse-manager";

// Client-side hook for consuming SSE events
export { useSSE } from "./hooks/useSSE";

// Types for SSE events and connections
export * from "./types";

// Utilities for SSE integration
export * from "./utils";
