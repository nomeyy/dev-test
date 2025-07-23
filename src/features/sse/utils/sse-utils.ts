import { randomUUID } from "crypto";
import type { SSERequestContext, SSEEvent } from "../types";

/**
 * Generate a unique client ID
 */
export function generateClientId(): string {
  return `sse-${randomUUID()}`;
}

/**
 * Extract user information from request context
 */
export function extractUserInfo(context: SSERequestContext): {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
} {
  const userAgent = context.request.headers.get("user-agent") ?? undefined;
  const ip = context.request.headers.get("x-forwarded-for") ?? 
             context.request.headers.get("x-real-ip") ?? 
             "unknown";

  return {
    userId: context.userId,
    sessionId: context.sessionId,
    userAgent,
    ip: ip.split(",")[0]?.trim() ?? "unknown", // Get first IP if multiple
  };
}

/**
 * Parse channels from request query parameters
 */
export function parseChannels(request: Request): Set<string> {
  const url = new URL(request.url);
  const channelsParam = url.searchParams.get("channels");
  
  if (!channelsParam) {
    return new Set(["default"]);
  }

  const channels = channelsParam.split(",").map(channel => channel.trim());
  return new Set(channels.filter(channel => channel.length > 0));
}

/**
 * Validate SSE event data
 */
export function validateSSEEvent(event: unknown): event is SSEEvent {
  return (
    event !== null &&
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    typeof (event as Record<string, unknown>).type === "string" &&
    "data" in event &&
    typeof (event as Record<string, unknown>).data === "object" &&
    (event as Record<string, unknown>).data !== null &&
    "timestamp" in event &&
    typeof (event as Record<string, unknown>).timestamp === "number"
  );
}

/**
 * Create a heartbeat event
 */
export function createHeartbeatEvent(): SSEEvent {
  return {
    type: "heartbeat",
    data: { timestamp: Date.now() },
    timestamp: Date.now(),
  };
}

/**
 * Create a ping event
 */
export function createPingEvent(): SSEEvent {
  return {
    type: "ping",
    data: { timestamp: Date.now() },
    timestamp: Date.now(),
  };
}

/**
 * Format SSE event according to the SSE specification
 */
export function formatSSEEvent(event: SSEEvent): string {
  const lines = [
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.data)}`,
    `id: ${event.id ?? Date.now().toString()}`,
    `timestamp: ${event.timestamp}`,
    "", // Empty line to separate events
  ];
  return lines.join("\n");
}

/**
 * Create SSE response headers
 */
export function createSSEHeaders(): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  headers.set("Connection", "keep-alive");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Cache-Control");
  headers.set("Access-Control-Allow-Methods", "GET");
  return headers;
}

/**
 * Check if a request is for SSE connection
 */
export function isSSERequest(request: Request): boolean {
  const accept = request.headers.get("accept");
  return accept?.includes("text/event-stream") ?? false;
}

/**
 * Validate client connection parameters
 */
export function validateConnectionParams(context: SSERequestContext): {
  isValid: boolean;
  error?: string;
} {
  // Basic validation - you can add more specific rules here
  if (!context.userId && !context.sessionId) {
    return {
      isValid: false,
      error: "Either userId or sessionId is required",
    };
  }

  return { isValid: true };
}

/**
 * Create a connection error event
 */
export function createErrorEvent(message: string, code?: string): SSEEvent {
  return {
    type: "system_message",
    data: {
      message,
      code,
    },
    timestamp: Date.now(),
  };
}

/**
 * Sanitize channel name to prevent injection attacks
 */
export function sanitizeChannelName(channel: string): string {
  // Remove any non-alphanumeric characters except hyphens and underscores
  return channel.replace(/[^a-zA-Z0-9\-_]/g, "").toLowerCase();
}

/**
 * Check if a channel name is valid
 */
export function isValidChannelName(channel: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(channel) && channel.length <= 50;
}

/**
 * Create a connection success event
 */
export function createConnectionSuccessEvent(clientId: string): SSEEvent {
  return {
    type: "system_message",
    data: {
      message: "SSE connection established",
      code: "CONNECTION_SUCCESS",
      clientId,
    },
    timestamp: Date.now(),
  };
} 