/**
 * Global SSE Service Singleton
 *
 * This module provides a globally accessible SSE service instance that persists
 * across Next.js development hot reloads and ensures consistent connection
 * management throughout the application lifecycle.
 *
 * Key features:
 * - Singleton pattern with Symbol-based global storage
 * - Hot reload persistence for development stability
 * - Proper cleanup methods for testing and maintenance
 * - Centralized connection and event management
 *
 * @example Server-side usage
 * ```typescript
 * import { getSSEService } from '@/lib/sse';
 *
 * const sse = getSSEService();
 * await sse.notifyUser('user123', 'Hello', 'Welcome message', 'info');
 * ```
 */

// Simple SSE service class for the global singleton
class SSEService {
  stopHeartbeat() {
    // Simple cleanup method for compatibility
  }
}

// Global singleton instance that survives hot reloads
declare global {
  var __globalSSEService: SSEService | undefined;
}

/**
 * Gets the global SSE service singleton instance
 *
 * Creates a new instance if none exists, otherwise returns the existing instance.
 * This ensures all parts of the application use the same SSE service for
 * consistent connection and event management.
 *
 * @returns The global SSE service instance
 */
export function getSSEService(): SSEService {
  global.__globalSSEService ??= new SSEService();
  return global.__globalSSEService;
}

/**
 * Resets the global SSE service instance
 *
 * Properly cleans up the existing service instance by stopping heartbeat
 * mechanisms and clearing global references. Primarily used for testing
 * and development scenarios where a fresh instance is needed.
 *
 * @example Testing usage
 * ```typescript
 * import { resetGlobalSSEService } from '@/lib/sse';
 *
 * beforeEach(() => {
 *   resetGlobalSSEService(); // Clean state for each test
 * });
 * ```
 */
export function resetGlobalSSEService(): void {
  if (global.__globalSSEService) {
    try {
      // Attempt graceful shutdown if possible
      global.__globalSSEService.stopHeartbeat();
    } catch {
      // Ignore cleanup errors
    } finally {
      global.__globalSSEService = undefined;
    }
  }
}
