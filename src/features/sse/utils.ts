import { getSSEManager } from "./sse-manager";
import type { SSEEvent } from "./types";

/**
 * Send an event to a specific client
 */
export async function sendToClient(
  clientId: string,
  event: string,
  data: any,
): Promise<boolean> {
  try {
    const sseManager = getSSEManager();
    const sseEvent: SSEEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };
    return await sseManager.sendToClient(clientId, sseEvent);
  } catch (error) {
    console.error(`SSE: Error sending to client ${clientId}:`, error);
    return false;
  }
}

/**
 * Send an event to all clients of a specific user
 */
export async function sendToUser(
  userId: string,
  event: string,
  data: any,
): Promise<number> {
  try {
    const sseManager = getSSEManager();
    const sseEvent: SSEEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };
    return await sseManager.sendToUser(userId, sseEvent);
  } catch (error) {
    console.error(`SSE: Error sending to user ${userId}:`, error);
    return 0;
  }
}

/**
 * Broadcast an event to all connected clients
 */
export async function broadcast(event: string, data: any): Promise<number> {
  try {
    const sseManager = getSSEManager();
    const sseEvent: SSEEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };
    return await sseManager.broadcast(sseEvent);
  } catch (error) {
    console.error("SSE: Error broadcasting event:", error);
    return 0;
  }
}

/**
 * Get the current number of connected clients
 */
export function getClientCount(): number {
  const sseManager = getSSEManager();
  return sseManager.getClientCount();
}

/**
 * Check if a client is connected
 */
export function isClientConnected(clientId: string): boolean {
  const sseManager = getSSEManager();
  return sseManager.isClientConnected(clientId);
}

/**
 * Get client information
 */
export function getClientById(clientId: string) {
  const sseManager = getSSEManager();
  return sseManager.getClientById(clientId);
}

/**
 * Get all clients for a specific user
 */
export function getClientsByUserId(userId: string) {
  const sseManager = getSSEManager();
  return sseManager.getClientsByUserId(userId);
}

/**
 * Send a notification to a user
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
): Promise<number> {
  return await sendToUser(userId, "notification", {
    title,
    message,
    type,
    timestamp: Date.now(),
  });
}

/**
 * Send a notification to a specific client
 */
export async function sendNotificationToClient(
  clientId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
): Promise<boolean> {
  return await sendToClient(clientId, "notification", {
    title,
    message,
    type,
    timestamp: Date.now(),
  });
}

/**
 * Send a system update to all clients
 */
export async function sendSystemUpdate(
  update: string,
  details?: any,
): Promise<number> {
  return await broadcast("system_update", {
    update,
    details,
    timestamp: Date.now(),
  });
}

/**
 * Send an error event to a client
 */
export async function sendErrorToClient(
  clientId: string,
  error: string,
  details?: any,
): Promise<boolean> {
  return await sendToClient(clientId, "error", {
    error,
    details,
    timestamp: Date.now(),
  });
}

/**
 * Send a reconnect event to a client
 */
export async function sendReconnectToClient(
  clientId: string,
  reason?: string,
): Promise<boolean> {
  return await sendToClient(clientId, "reconnect", {
    reason,
    timestamp: Date.now(),
  });
}
