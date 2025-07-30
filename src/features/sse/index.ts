/**
 * SSE Feature Module
 *
 * Provides Server-Sent Events functionality for real-time client notifications
 */

// Export types
export type {
  SSEConnection,
  SSEEvent,
  SSEConnectionMetadata,
  SSEConnectionRequest,
  SSETarget,
  EventPayload,
  HeartbeatConfig,
  SSEConfig,
  SSEError,
  StoredConnection,
} from "./types";

// Export service interfaces
export type {
  SSEManager,
  SSEServiceAPI,
  HeartbeatManager,
  ConnectionStore,
} from "./services/interfaces";

// Export server-side implementations
export {
  RedisConnectionStore,
  ConnectionStoreError,
  ConnectionStoreErrorCode,
} from "./stores/connection-store";
export {
  SSEConnectionManager,
  SSEManagerError,
  SSEManagerErrorCode,
  SSEHeartbeatManager,
  SSEService,
  SSEServiceError,
  SSEServiceErrorCode,
  sseService,
} from "./services";

// Export utilities
export {
  SSEMessageFormatter,
  SSEFormatterError,
  SSEFormatterErrorCode,
} from "./utils/message-formatter";

// Export client-side utilities
export {
  SSEClient,
  SSEConnectionState,
  type SSEClientConfig,
  type SSEEventHandler,
  type SSEErrorHandler,
  type SSEStateChangeHandler,
} from "./client/sse-client";

// Export components
export { SSEDemo } from "./components/SSEDemo";

export {
  SSEEventHandlers,
  EventDebouncer,
  EventBatcher,
  EventFilter,
  type NotificationEvent,
  type UserUpdateEvent,
  type SystemEvent,
  type ChatMessageEvent,
} from "./client/event-helpers";

// Default configuration
export const DEFAULT_SSE_CONFIG: SSEConfig = {
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 60000, // 1 minute
    maxMissedPings: 3,
    enabled: true,
  },
  redis: {
    keyPrefix: "sse:",
    connectionTtl: 3600, // 1 hour
    cleanupInterval: 300, // 5 minutes
  },
  limits: {
    maxConnections: 10000,
    maxEventsPerSecond: 1000,
    maxPayloadSize: 65536, // 64KB
    connectionTimeout: 300000, // 5 minutes
  },
  features: {
    enabled: true,
    heartbeat: true,
    authentication: true,
    rateLimiting: true,
    monitoring: true,
    compression: false,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    logLevel: "info",
  },
  security: {
    requireAuth: true,
    allowedOrigins: ["*"],
    maxConnectionsPerUser: 10,
    maxConnectionsPerIP: 100,
  },
};

// Re-export from types for convenience
import type { SSEConfig } from "./types";

// Export configuration utilities
export {
  requireSSEEnabled,
  requireFeatureEnabled,
  getSecurityConfig,
  isOriginAllowed,
  getConnectionTimeout,
} from "./config/utils";
