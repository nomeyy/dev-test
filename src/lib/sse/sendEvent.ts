// lib/sse/sendEvent.ts
import sseManager from "./manager";

/**
 * Send an event to a specific client by ID
 * @param id Client identifier
 * @param event Event name
 * @param data Event payload
 * @returns true if sent successfully, false otherwise
 */
export const sendToClient = (
  id: string,
  event: string,
  data: unknown,
): boolean => {
  try {
    return sseManager.sendEvent(id, event, data);
  } catch (error) {
    console.error(`❌ Error sending event '${event}' to client ${id}:`, error);
    return false;
  }
};

/**
 * Broadcast an event to all connected clients
 * @param event Event name
 * @param data Event payload
 * @returns number of clients that received the event
 */
export const broadcast = (event: string, data: unknown): number => {
  try {
    return sseManager.broadcast(event, data);
  } catch (error) {
    console.error(`❌ Error broadcasting event '${event}':`, error);
    return 0;
  }
};

/**
 * Get the current number of connected clients
 * @returns number of connected clients
 */
export const getClientCount = (): number => {
  return sseManager.getClientCount();
};

/**
 * Send a notification event (convenience function)
 * @param message The notification message
 * @param type Optional notification type (default: 'info')
 * @param targetId Optional client ID to send to specific client
 */
export const sendNotification = (
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  targetId?: string,
) => {
  const payload = {
    message,
    type,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  };

  if (targetId) {
    return sendToClient(targetId, "notification", payload);
  } else {
    return broadcast("notification", payload);
  }
};
