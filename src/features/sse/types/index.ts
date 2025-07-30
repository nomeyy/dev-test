import type { NextRequest } from "next/server";

/**
 * SSE Event types
 */
export interface SSEEvent {
  id?: string;
  event: string;
  data: string;
  retry?: number;
}

/**
 * SSE Client connection information
 */
export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  request: NextRequest;
  response: Response;
  controller: ReadableStreamDefaultController;
  stream: ReadableStream | null;
  lastActivity: number;
  isConnected: boolean;
}

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  heartbeatInterval?: number; // milliseconds
  maxConnections?: number;
  connectionTimeout?: number; // milliseconds
  enableLogging?: boolean;
}

/**
 * SSE Event payload
 */
export interface SSEEventPayload {
  [key: string]: unknown;
}

/**
 * SSE Broadcast options
 */
export interface SSEBroadcastOptions {
  event?: string;
  excludeClientIds?: string[];
  includeClientIds?: string[];
  userIds?: string[];
  sessionIds?: string[];
}

/**
 * SSE Connection statistics
 */
export interface SSEConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalEventsSent: number;
  totalBroadcasts: number;
}

/**
 * SSE Error types
 */
export enum SSEErrorType {
  CONNECTION_LIMIT_EXCEEDED = "CONNECTION_LIMIT_EXCEEDED",
  CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",
  INVALID_EVENT = "INVALID_EVENT",
  STREAM_ERROR = "STREAM_ERROR",
}

/**
 * SSE Error
 */
export interface SSEError {
  type: SSEErrorType;
  message: string;
  clientId?: string;
  timestamp: number;
}
