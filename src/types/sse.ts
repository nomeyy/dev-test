/**
 * SSE Type Definitions
 *
 * Centralized type definitions for Server-Sent Events functionality
 */

// Re-export types from hook
export type {
  SSEEvent,
  SSEMetrics,
  SSEHealth,
  ConnectionOptions,
  SendEventParams,
  SendEventResult,
  UseSSEConnectionReturn,
} from "@/hooks/useSSEConnection";

// Re-export types from SSE library
export type {
  ClientId,
  UserId,
  SessionId,
  ConnectionState,
  Connection,
  SSEEvent as LibSSEEvent,
  EventTarget,
  SendParams,
  DispatchResult,
  SSEMetrics as LibSSEMetrics,
  HealthStatus,
  SSEConfig,
  Result,
  SSEError,
  SSEErrorCode,
} from "@/lib/sse/types";

// Import types for use in this file
import type { SSEEvent, SSEHealth } from "@/hooks/useSSEConnection";

// Additional type utilities
export type EventData<T = unknown> = T;

export interface SSEMessage<T = unknown> {
  id?: string;
  event?: string;
  data: T;
  retry?: number;
}

export type EventHandler<T = unknown> = (event: SSEEvent<T>) => void;

export interface SSEConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  health: SSEHealth;
}

export interface SSEEventLogEntry<T = unknown> extends SSEEvent<T> {
  receivedAt: number;
  processed: boolean;
}
