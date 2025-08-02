/**
 * SSE System Index
 *
 * Centralized exports for the modular SSE system
 */

// Main service (optimized version)
export { sseService } from "./sse-service-optimized";

// Individual managers (for advanced usage)
export { ConnectionManager } from "./connection-manager";
export { HeartbeatManager } from "./heartbeat-manager";
export { StatsManager } from "./stats-manager";

// Types and interfaces
export type {
  SSEClient,
  SSEEvent,
  SSEConnectionOptions,
  SSEServiceConfig,
  SSEStats,
  HeartbeatConfig,
  HeartbeatStats,
} from "./types";

export { DEFAULT_CONFIG } from "./types";

// Logger
export { sseLogger } from "./logger";

// Legacy service (for backward compatibility)
// export { sseService as legacySSEService } from "./sse-service";
