import { randomUUID } from "crypto";
import type { SSEEvent } from "./types";
import { SSEEventType } from "./types";

/**
 * Generate a unique connection ID
 */
export function generateConnectionId(): string {
  return `sse_${randomUUID()}`;
}

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an SSE event object
 */
export function createSSEEvent(
  type: SSEEventType | string,
  data: any,
  options: {
    userId?: string;
    sessionId?: string;
    id?: string;
  } = {},
): SSEEvent {
  return {
    id: options.id ?? generateEventId(),
    type,
    data,
    timestamp: Date.now(),
    userId: options.userId,
    sessionId: options.sessionId,
  };
}

/**
 * Format an SSE event for transmission over EventSource
 */
export function formatSSEMessage(event: SSEEvent): string {
  const lines: string[] = [];

  // Add event ID
  lines.push(`id: ${event.id}`);

  // Add event type
  lines.push(`event: ${event.type}`);

  // Add data (JSON stringified)
  const dataStr = JSON.stringify({
    ...event.data,
    timestamp: event.timestamp,
    userId: event.userId,
    sessionId: event.sessionId,
  });

  // Split data into multiple lines if needed (SSE spec requirement)
  dataStr.split("\n").forEach((line) => {
    lines.push(`data: ${line}`);
  });

  // Add empty line to signal end of event
  lines.push("");

  return lines.join("\n");
}

/**
 * Create Redis keys for SSE operations
 */
export const SSERedisKeys = {
  connection: (connectionId: string) => `sse:connection:${connectionId}`,
  userConnections: (userId: string) => `sse:user:${userId}:connections`,
  sessionConnections: (sessionId: string) =>
    `sse:session:${sessionId}:connections`,
  allConnections: () => "sse:connections",
  pubsub: {
    channel: "sse:events",
    userChannel: (userId: string) => `sse:events:user:${userId}`,
    sessionChannel: (sessionId: string) => `sse:events:session:${sessionId}`,
    connectionChannel: (connectionId: string) =>
      `sse:events:connection:${connectionId}`,
  },
};

/**
 * Validate if a connection is still alive based on last heartbeat
 */
export function isConnectionAlive(
  lastHeartbeat: number,
  timeoutMs: number = 30000,
): boolean {
  return Date.now() - lastHeartbeat < timeoutMs;
}

/**
 * Extract client information from request headers
 */
export function extractClientInfo(headers: Headers) {
  return {
    userAgent: headers.get("user-agent") || undefined,
    ipAddress:
      headers.get("x-forwarded-for") ||
      headers.get("x-real-ip") ||
      headers.get("remote-addr") ||
      undefined,
  };
}
