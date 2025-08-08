/**
 * SSE System Type Definitions
 *
 * Core types and interfaces for the Server-Sent Events system
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Unique identifier for SSE connections
 */
export type ClientId = string;
export type UserId = string;
export type SessionId = string;

/**
 * Connection state machine states
 */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected";

/**
 * System health status
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Event priority levels for queue management
 */
export enum EventPriority {
  CRITICAL = 0, // System events, errors
  HIGH = 1, // Important notifications
  NORMAL = 2, // Regular updates
  LOW = 3, // Background updates
}

// ============================================================================
// Connection Interfaces
// ============================================================================

/**
 * Options for creating a new SSE connection
 */
export interface ConnectionOptions {
  userId?: UserId;
  sessionId?: SessionId;
  metadata?: Record<string, unknown>;
}

/**
 * Represents an active SSE connection
 */
export interface Connection {
  id: ClientId;
  userId?: UserId;
  sessionId?: SessionId;
  connectedAt: Date;
  lastActivity: Date;
  state: ConnectionState;
  metadata?: Record<string, unknown>;
  controller: ReadableStreamDefaultController<Uint8Array> | null;
  encoder: TextEncoder;
}

/**
 * Result of creating a new connection
 */
export interface ConnectionResult {
  clientId: ClientId;
  stream: ReadableStream<Uint8Array>;
}

// ============================================================================
// Event Interfaces
// ============================================================================

/**
 * Base SSE event structure
 */
export interface SSEEvent<T = unknown> {
  id?: string;
  type: string;
  data: T;
  retry?: number;
  timestamp?: number;
}

/**
 * System event types
 */
export enum SystemEventType {
  CONNECTION_ESTABLISHED = "system:connection:established",
  CONNECTION_CLOSED = "system:connection:closed",
  HEARTBEAT = "system:heartbeat",
  SERVER_SHUTDOWN = "system:shutdown",
  ERROR = "system:error",
}

/**
 * Event with priority for queue management
 */
export interface PrioritizedEvent<T = unknown> extends SSEEvent<T> {
  priority: EventPriority;
  expiresAt?: Date;
}

/**
 * Event dispatch target types
 */
export type EventTarget = "client" | "user" | "session" | "broadcast" | "all";

/**
 * Parameters for sending events
 */
export interface SendParams<T = unknown> {
  target: EventTarget;
  targetId?: string;
  event: SSEEvent<T>;
}

/**
 * Result of event dispatch operation
 */
export interface DispatchResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

// ============================================================================
// Health & Monitoring Interfaces
// ============================================================================

/**
 * Configuration for health monitoring
 */
export interface HealthConfig {
  enabled: boolean;
  heartbeatInterval: number; // milliseconds
  clientTimeout: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

/**
 * Health statistics
 */
export interface HealthStats {
  totalHeartbeatsSent: number;
  totalHeartbeatsReceived: number;
  clientTimeouts: number;
  lastHeartbeat?: Date;
  unhealthyConnections: number;
}

// ============================================================================
// Metrics Interfaces
// ============================================================================

/**
 * Connection statistics
 */
export interface ConnectionStats {
  active: number;
  total: number;
  byUser: Map<UserId, number>;
  bySession: Map<SessionId, number>;
  averageDuration: number;
}

/**
 * Event statistics
 */
export interface EventStats {
  sent: number;
  failed: number;
  rate: number; // events per second
  byType: Map<string, number>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  avgEventDeliveryMs: number;
  memoryUsageMB: number;
  cpuUsage: number;
  uptime: number;
}

/**
 * Complete SSE metrics
 */
export interface SSEMetrics {
  connections: ConnectionStats;
  events: EventStats;
  health: HealthStats;
  performance: PerformanceStats;
  timestamp: Date;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  maxLogs: number;
  enableConsole: boolean;
}

/**
 * Complete SSE configuration
 */
export interface SSEConfig {
  maxConnections: number;
  connectionTimeout: number;
  health: HealthConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;
  metrics: {
    enabled: boolean;
    interval: number;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SSEConfig = {
  maxConnections: 10000,
  connectionTimeout: 120000, // 2 minutes
  health: {
    enabled: true,
    heartbeatInterval: 30000, // 30 seconds
    clientTimeout: 60000, // 60 seconds
    cleanupInterval: 60000, // 60 seconds
  },
  rateLimit: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
  logging: {
    level: "info",
    maxLogs: 1000,
    enableConsole: true,
  },
  metrics: {
    enabled: true,
    interval: 60000, // 1 minute
  },
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * SSE error codes
 */
export enum SSEErrorCode {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",
  SEND_FAILED = "SEND_FAILED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  MAX_CONNECTIONS_REACHED = "MAX_CONNECTIONS_REACHED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Base SSE error class
 */
export class SSEError extends Error {
  constructor(
    public readonly code: SSEErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly recoverable = true,
  ) {
    super(message);
    this.name = "SSEError";
  }
}

// ============================================================================
// Result Type for Error Handling
// ============================================================================

/**
 * Result type for consistent error handling
 */
export type Result<T, E = SSEError> =
  | { success: true; data: T }
  | { success: false; error: E };

// ============================================================================
// API Types
// ============================================================================

/**
 * Request body for sending events via API
 */
export interface SendEventRequest {
  target: EventTarget;
  targetId?: string;
  event: {
    type: string;
    data: unknown;
    id?: string;
    retry?: number;
  };
}

/**
 * Response from send event API
 */
export interface SendEventResponse {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
  stats?: SSEMetrics;
}

/**
 * Response from stats API
 */
export interface StatsResponse {
  metrics: SSEMetrics;
  health: HealthStatus;
  uptime: number;
}
