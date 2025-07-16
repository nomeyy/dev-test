import type { NextRequest } from "next/server";

/**
 * Types of SSE events that can be sent to clients
 */
export enum SSEEventType {
  MESSAGE = "message",
  NOTIFICATION = "notification",
  UPLOAD_PROGRESS = "upload_progress",
  ASSET_READY = "asset_ready",
  USER_UPDATE = "user_update",
  HEARTBEAT = "heartbeat",
}

/**
 * Base SSE event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: number;
  id?: string;
}

/**
 * SSE message format for transmission
 */
export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Client connection information
 */
export interface SSEConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  request: NextRequest;
  controller: AbortController;
  lastActivity: number;
  isAlive: boolean;
  sendEvent?: (event: any) => void;
}

/**
 * Options for sending SSE events
 */
export interface SSESendOptions {
  userId?: string;
  sessionId?: string;
  connectionId?: string;
  broadcast?: boolean;
  excludeConnectionIds?: string[];
}

/**
 * SSE service configuration
 */
export interface SSEConfig {
  heartbeatInterval: number;
  maxConnections: number;
  connectionTimeout: number;
  enableLogging: boolean;
}
