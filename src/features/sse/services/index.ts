import { SSEManager } from "./sse-manager";

export { SSEManager };

// Singleton instance for global use
let sseManagerInstance: SSEManager | null = null;

/**
 * Get or create the global SSE manager instance
 */
export function getSSEManager(): SSEManager {
  sseManagerInstance ??= new SSEManager({
    maxConnectionsPerUser: 5,
    connectionTimeout: 5 * 60 * 1000, // 5 minutes
    heartbeatInterval: 60 * 1000, // 1 minute (increased from 30 seconds)
    cleanupInterval: 10 * 60 * 1000, // 10 minutes (increased from 1 minute)
    enableLogging: process.env.NODE_ENV === "development",
  });
  return sseManagerInstance;
}

/**
 * Destroy the global SSE manager instance
 */
export async function destroySSEManager(): Promise<void> {
  if (sseManagerInstance) {
    await sseManagerInstance.destroy();
    sseManagerInstance = null;
  }
}
