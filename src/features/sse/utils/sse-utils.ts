import { SSEManager } from "@/features/sse";
import type { SSEEvent } from "../types/sse-types.js";

// Singleton instance getter (reuse the one from the API route if possible)
let sseManager: SSEManager | null = null;
function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager({
      heartbeatInterval: 30000,
      connectionTimeout: 120000,
      maxConnections: 1000,
      enableRedis: false,
      enableLogging: true,
      enableMetrics: true,
    });
  }
  return sseManager;
}

/**
 * Send an event to a specific user (all their connected clients)
 */
export async function sendEventToUser(
  userId: string,
  eventType: string,
  data: Record<string, any>,
  metadata?: Record<string, any>,
): Promise<void> {
  const manager = getSSEManager();
  await manager.sendEventToUser(userId, { type: eventType, data, metadata });
}

/**
 * Broadcast an event to all connected clients
 */
export async function broadcastEvent(
  eventType: string,
  data: Record<string, any>,
  metadata?: Record<string, any>,
): Promise<void> {
  const manager = getSSEManager();
  await manager.broadcastEvent({ type: eventType, data, metadata });
}

/**
 * Send an event to a specific group
 */
export async function sendEventToGroup(
  group: string,
  eventType: string,
  data: Record<string, any>,
  metadata?: Record<string, any>,
): Promise<void> {
  const manager = getSSEManager();
  await manager.sendEventToGroup(group, { type: eventType, data, metadata });
}

/**
 * Helper to build an SSE event object (without id/timestamp)
 */
export function createSSEEvent(
  type: string,
  data: Record<string, any>,
  metadata?: Record<string, any>,
): Omit<SSEEvent, "id" | "timestamp"> {
  return { type, data, metadata };
}

/**
 * Get SSE manager statistics
 *
 * @returns SSE manager statistics
 */
export async function getSSEStats(): Promise<any> {
  // TODO: Implement stats retrieval
  throw new Error("Function not implemented");
}
