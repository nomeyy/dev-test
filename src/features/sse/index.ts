/**
 * SSE (Server-Sent Events) Feature
 *
 * This module provides a centralized SSE management system for real-time
 * server-to-client communication. It handles connection management, event
 * dispatching, heartbeats, and provides a clean API for backend services.
 */

export * from "./services/sse-manager";
export * from "./utils/sse-helpers";

// React hooks and components for client-side usage
export * from "./hooks/useSSE";
export * from "./components/SSEProvider";
