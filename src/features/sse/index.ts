// Client-safe exports only
// This file should only export things that are safe to use in client components

// Export types (safe for both client and server)
export * from "./types";

// Export hooks (client-side safe)
export { useSSE } from "./hooks/useSSE";

// Export utilities (safe for both)
export { createSSEEvent, sseEvents } from "./utils/event-factory";
