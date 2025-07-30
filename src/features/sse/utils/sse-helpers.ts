/**
 * SSE Utility Functions
 */

import type { SSEEvent } from "../types";

/**
 * Formats an SSE event into the proper SSE format
 */
export function formatSSEEvent(event: SSEEvent): string {
  let formatted = "";

  if (event.id) {
    formatted += `id: ${event.id}\n`;
  }

  if (event.event) {
    formatted += `event: ${event.event}\n`;
  }

  if (event.retry) {
    formatted += `retry: ${event.retry}\n`;
  }

  // Handle data - can be string or object
  const dataString =
    typeof event.data === "string" ? event.data : JSON.stringify(event.data);

  // Split multi-line data and prefix each line with "data: "
  const dataLines = dataString.split("\n");
  for (const line of dataLines) {
    formatted += `data: ${line}\n`;
  }

  // End with double newline
  formatted += "\n";

  return formatted;
}

/**
 * Creates a heartbeat/ping event
 */
export function createHeartbeatEvent(): SSEEvent {
  return {
    event: "heartbeat",
    data: { timestamp: new Date().toISOString() },
    id: `heartbeat_${Date.now()}`,
  };
}

/**
 * Creates a connection established event
 */
export function createConnectionEvent(clientId: string): SSEEvent {
  return {
    event: "connection",
    data: {
      clientId,
      message: "SSE connection established",
      timestamp: new Date().toISOString(),
    },
    id: `connection_${clientId}`,
  };
}

/**
 * Creates an error event
 */
export function createErrorEvent(
  error: string | Error,
  eventId?: string,
): SSEEvent {
  const errorMessage = error instanceof Error ? error.message : error;

  return {
    event: "error",
    data: {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    },
    id: eventId ?? `error_${Date.now()}`,
  };
}

/**
 * Encodes a string to Uint8Array for SSE streaming
 */
export function encodeSSEData(data: string): Uint8Array {
  return new TextEncoder().encode(data);
}

/**
 * Generates a unique client ID
 */
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates if a client is still active based on last activity
 */
export function isClientActive(
  lastActivity: Date,
  maxIdleTime: number,
): boolean {
  const now = new Date();
  const timeDiff = now.getTime() - lastActivity.getTime();
  return timeDiff < maxIdleTime;
}

/**
 * Creates SSE headers for the response
 */
export function createSSEHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  };
}
