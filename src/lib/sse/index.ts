/**
 * SSE Library Main Export
 * 
 * Centralized exports for the Server-Sent Events system
 */

// Main service
export { SSEService, getSSEService } from './services/sse-service';
export type { ISSEService } from './services/sse-service';

// Core components (for advanced usage)
export { ConnectionManager } from './core/connection-manager';
export { EventDispatcher } from './core/event-dispatcher';
export { HealthMonitor } from './core/health-monitor';
export { MetricsCollector } from './core/metrics-collector';

// Types and interfaces
export type {
  // Connection types
  ClientId,
  UserId,
  SessionId,
  Connection,
  ConnectionOptions,
  ConnectionResult,
  ConnectionState,
  
  // Event types
  SSEEvent,
  EventTarget,
  PrioritizedEvent,
  SendParams,
  DispatchResult,
  
  // Health types
  HealthStatus,
  HealthConfig,
  HealthStats,
  
  // Metrics types
  SSEMetrics,
  ConnectionStats,
  EventStats,
  PerformanceStats,
  
  // Configuration
  SSEConfig,
  RateLimitConfig,
  LoggingConfig,
  
  // Error handling
  Result,
  
  // API types
  SendEventRequest,
  SendEventResponse,
  StatsResponse
} from './types';

// Export enums and constants
export {
  EventPriority,
  SystemEventType,
  SSEErrorCode,
  DEFAULT_CONFIG,
  SSEError
} from './types';

// Convenience re-exports for common use cases
import { SSEService } from './services/sse-service';
import type { SSEConfig } from './types';

export const createSSEService = (config?: Partial<SSEConfig>) => {
  return new SSEService(config);
};