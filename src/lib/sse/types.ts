/**
 * SSE System Types and Interfaces
 *
 * Centralized type definitions for the SSE system
 */

export interface SSEClient {
  readonly id: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly connectedAt: Date;
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly encoder: TextEncoder;
  lastHeartbeat?: Date;
  metadata?: Record<string, unknown>;
}

export interface SSEEvent<T = unknown> {
  readonly type: string;
  readonly data: T;
  readonly timestamp?: string;
  readonly id?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface SSEServiceConfig {
  heartbeatInterval: number;
  clientTimeout: number;
  maxClients: number;
  enableHeartbeat: boolean;
}

export interface SSEStats {
  totalClients: number;
  totalUsers: number;
  totalSessions: number;
  uptime: number;
  heartbeatEnabled: boolean;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  totalHeartbeatsSent: number;
  totalHeartbeatsReceived: number;
  lastHeartbeat?: Date;
  activeHeartbeats: number;
}

export interface HeartbeatConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
}

export interface HeartbeatStats {
  totalPings: number;
  activePings: number;
  timeouts: number;
  lastPing?: Date;
}

// Default configuration
export const DEFAULT_CONFIG: SSEServiceConfig = {
  heartbeatInterval: 30000, // 30 seconds
  clientTimeout: 60000, // 60 seconds
  maxClients: 1000,
  enableHeartbeat: true,
};
