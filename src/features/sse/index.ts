/**
 * Public API for the SSE (Server-Sent Events) module.
 * This file exports the components, services and types that should be
 * accessible to other parts of the application.
 */

// Main SSE manager for backend services to send events
export { SSEManager } from "./manager";

// Types for SSE implementation
export * from "./types";

// React hook for client-side SSE consumption
export { useSSE } from "./hooks/useSSE";
