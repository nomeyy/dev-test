/**
 * Public API for the SSE (Server-Sent Events) module.
 * This file exports the components, services, utilities and types that should be
 * accessible to other parts of the application.
 */

// Core SSE services
export { SSEManager } from "./services/sse-manager";
export { SSEService } from "./services/sse-service";

// Utility functions
export * from "./utils/sse-utils";

// Client utilities
export { SSEClient, createSSEClient } from "./utils/sse-client";

// Components
export { SSETestUI } from "./components/SSETestUI";

// Types
export * from "./types";

// Global SSE service instance for backend integration
let globalSSEService: import("./services/sse-service").SSEService | null = null;

/**
 * Get the global SSE service instance
 * This provides a singleton pattern for backend modules to send notifications
 */
export function getSSEService(): import("./services/sse-service").SSEService {
  if (!globalSSEService) {
    const manager = new SSEManager();
    globalSSEService = new SSEService(manager);
  }
  return globalSSEService;
}

/**
 * Clean up the global SSE service
 * Should be called when the application shuts down
 */
export function cleanupSSEService(): void {
  if (globalSSEService) {
    globalSSEService.getManager().cleanup();
    globalSSEService = null;
  }
} 