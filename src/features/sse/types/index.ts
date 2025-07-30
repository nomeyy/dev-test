/**
 * Core TypeScript interfaces for SSE feature
 */

/**
 * Represents an active SSE connection
 */
export interface SSEConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  clientId?: string;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
  lastPing: Date;
}

/**
 * SSE event structure for sending to clients
 */
export interface SSEEvent {
  id?: string;
  event?: string;
  data: any;
  retry?: number;
}

/**
 * Connection metadata stored in Redis
 */
export interface SSEConnectionMetadata {
  id: string;
  userId?: string;
  sessionId?: string;
  clientId?: string;
  connectedAt: string;
  lastActivity: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Connection request parameters
 */
export interface SSEConnectionRequest {
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

/**
 * Event target specification
 */
export interface SSETarget {
  type: "user" | "session" | "client" | "broadcast";
  id?: string;
}

/**
 * Event payload structure
 */
export interface EventPayload {
  type: string;
  timestamp: string;
  data: any;
  metadata?: {
    source?: string;
    version?: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

/**
 * Heartbeat configuration
 */
export interface HeartbeatConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  maxMissedPings: number;
  enabled: boolean;
}

/**
 * SSE feature flags
 */
export interface SSEFeatureFlags {
  enabled: boolean;
  heartbeat: boolean;
  authentication: boolean;
  rateLimiting: boolean;
  monitoring: boolean;
  compression: boolean;
}

/**
 * SSE monitoring configuration
 */
export interface SSEMonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // milliseconds
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * SSE security configuration
 */
export interface SSESecurityConfig {
  requireAuth: boolean;
  allowedOrigins: string[];
  maxConnectionsPerUser: number;
  maxConnectionsPerIP: number;
}

/**
 * SSE service configuration
 */
export interface SSEConfig {
  heartbeat: HeartbeatConfig;
  redis: {
    keyPrefix: string;
    connectionTtl: number; // seconds
    cleanupInterval: number; // seconds
  };
  limits: {
    maxConnections: number;
    maxEventsPerSecond: number;
    maxPayloadSize: number; // bytes
    connectionTimeout: number; // milliseconds
  };
  features: SSEFeatureFlags;
  monitoring: SSEMonitoringConfig;
  security: SSESecurityConfig;
}

/**
 * Configuration validation error
 */
export interface SSEConfigValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * SSE error structure
 */
export interface SSEError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  connectionId?: string;
}

/**
 * Stored connection data in Redis
 */
export interface StoredConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  clientId?: string;
  connectedAt: string;
  lastActivity: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    origin?: string;
  };
}
