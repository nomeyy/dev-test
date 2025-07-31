import { z } from "zod";

/**
 * SSE Event structure for all server-sent events
 */
export const SSEEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.any(),
  timestamp: z.number(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

/**
 * SSE Connection information stored in Redis
 */
export const SSEConnectionSchema = z.object({
  connectionId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  connectedAt: z.number(),
  lastHeartbeat: z.number(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type SSEConnection = z.infer<typeof SSEConnectionSchema>;

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
  maxConnections: number;
  cleanupInterval: number; // milliseconds
}

/**
 * SSE Event types for different use cases
 */
export enum SSEEventType {
  // System events
  HEARTBEAT = "heartbeat",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",

  // Application events
  NOTIFICATION = "notification",
  USER_UPDATE = "user_update",
  BROADCAST = "broadcast",

  // Demo/Test events
  TEST_MESSAGE = "test_message",
}

/**
 * SSE Client status
 */
export enum SSEStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
  RECONNECTING = "reconnecting",
}

/**
 * Options for sending SSE events
 */
export interface SendEventOptions {
  userId?: string;
  sessionId?: string;
  connectionId?: string;
  broadcast?: boolean;
}

/**
 * SSE Hook state
 */
export interface SSEHookState {
  status: SSEStatus;
  lastEvent: SSEEvent | null;
  eventHistory: SSEEvent[];
  error: Error | null;
  connectionId: string | null;
}
