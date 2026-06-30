import type { SSEEvent } from "../types";

/**
 * Formats SSE event data according to the Server-Sent Events specification
 *
 * @param event - The SSE event to format
 * @returns Formatted SSE message string
 */
export function formatSSEMessage(event: SSEEvent): string {
  const lines: string[] = [];

  // Add event ID if provided
  if (event.id) {
    lines.push(`id: ${event.id}`);
  }

  // Add event name
  lines.push(`event: ${event.event}`);

  // Add retry interval if provided
  if (event.retry) {
    lines.push(`retry: ${event.retry}`);
  }

  // Format data - handle both string and object data
  const dataString =
    typeof event.data === "string" ? event.data : JSON.stringify(event.data);

  // Split multi-line data and add each line with 'data: ' prefix
  const dataLines = dataString.split("\n");
  dataLines.forEach((line) => {
    lines.push(`data: ${line}`);
  });

  // Add final empty line to complete the message
  lines.push("");

  return lines.join("\n");
}

/**
 * Creates a heartbeat/ping event
 *
 * @param message - Optional ping message
 * @returns Formatted ping SSE event
 */
export function createHeartbeatEvent(message = "ping"): string {
  return formatSSEMessage({
    event: "ping",
    data: message,
  });
}

/**
 * Creates a notification event
 *
 * @param title - Notification title
 * @param message - Notification message
 * @param type - Notification type (success, error, info, warning)
 * @param metadata - Additional metadata
 * @returns Formatted notification SSE event
 */
export function createNotificationEvent(
  title: string,
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  metadata?: Record<string, unknown>,
): string {
  return formatSSEMessage({
    id: crypto.randomUUID(),
    event: "notification",
    data: {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
}

/**
 * Creates a custom event
 *
 * @param eventName - Custom event name
 * @param data - Event data
 * @param id - Optional event ID
 * @returns Formatted custom SSE event
 */
export function createCustomEvent(
  eventName: string,
  data: string | Record<string, unknown>,
  id?: string,
): string {
  return formatSSEMessage({
    id: id ?? crypto.randomUUID(),
    event: eventName,
    data,
  });
}

/**
 * Creates a user update event
 *
 * @param userId - User ID
 * @param updateType - Type of update
 * @param data - Update data
 * @returns Formatted user update SSE event
 */
export function createUserUpdateEvent(
  userId: string,
  updateType: string,
  data: unknown,
): string {
  return formatSSEMessage({
    id: crypto.randomUUID(),
    event: "user_update",
    data: {
      userId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Creates a system message event
 *
 * @param message - System message
 * @param level - Message level (info, warning, error)
 * @param data - Additional data
 * @returns Formatted system message SSE event
 */
export function createSystemMessageEvent(
  message: string,
  level: "info" | "warning" | "error" = "info",
  data?: unknown,
): string {
  return formatSSEMessage({
    id: crypto.randomUUID(),
    event: "system_message",
    data: {
      message,
      level,
      data,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Validates SSE event format
 *
 * @param event - Event to validate
 * @returns boolean indicating if event is valid
 */
export function isValidSSEEvent(event: unknown): event is SSEEvent {
  if (!event || typeof event !== "object") return false;

  const e = event as Record<string, unknown>;

  // Event name is required
  if (!e.event || typeof e.event !== "string") return false;

  // Data is required
  if (e.data === undefined) return false;

  // ID is optional but must be string if provided
  if (e.id !== undefined && typeof e.id !== "string") return false;

  // Retry is optional but must be number if provided
  if (e.retry !== undefined && typeof e.retry !== "number") return false;

  return true;
}

/**
 * Sanitizes event data for safe transmission
 *
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeEventData(
  data: unknown,
): string | Record<string, unknown> {
  if (typeof data === "string") {
    // Remove any potential SSE control characters
    return data.replace(/[\r\n]/g, " ").trim();
  }

  if (data && typeof data === "object") {
    try {
      // Parse and stringify to remove functions and ensure serializable
      const parsed: unknown = JSON.parse(JSON.stringify(data));
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : { value: parsed };
    } catch {
      return { error: "Invalid data format" };
    }
  }

  return { value: data };
}
