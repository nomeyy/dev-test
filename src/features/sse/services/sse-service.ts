import { logger } from "@/utils/logging";
import { SSEManager } from "./sse-manager";
import type {
  SSEMessage,
  SSEConnectionOptions,
  SSEManagerConfig,
} from "../types";

// Global SSE manager instance
let sseManager: SSEManager | null = null;
const sseLogger = logger.createContextLogger("SSE");

/**
 * Initialize the SSE manager
 */
export function initializeSSE(config?: SSEManagerConfig): SSEManager {
  if (sseManager) {
    sseLogger.warn("Manager already initialized");
    return sseManager;
  }

  sseManager = new SSEManager(config);
  sseLogger.info("Manager initialized");
  return sseManager;
}

/**
 * Get the SSE manager instance
 */
export function getSSEManager(): SSEManager {
  if (!sseManager) {
    throw new Error(
      "SSE: Manager not initialized. Call initializeSSE() first.",
    );
  }
  return sseManager;
}

/**
 * Register a new client connection
 */
export function registerSSEClient(
  clientId: string,
  controller: ReadableStreamDefaultController,
  options: SSEConnectionOptions = {},
): boolean {
  const manager = getSSEManager();
  return manager.registerClient(clientId, controller, options);
}

/**
 * Remove a client connection
 */
export function removeSSEClient(clientId: string): void {
  const manager = getSSEManager();
  manager.removeClient(clientId);
}

/**
 * Send a message to all connected clients
 */
export function broadcastToAll(event: string, data: any): void {
  const message: SSEMessage = {
    event,
    data,
    target: "all",
  };

  const manager = getSSEManager();
  const stats = manager.getStats();
  sseLogger.info(`Broadcasting to all clients`, {
    event,
    totalConnections: stats.totalConnections,
    message,
  });
  manager.sendMessage(message);
}

/**
 * Send a message to a specific user
 */
export function sendToUser(userId: string, event: string, data: any): void {
  const message: SSEMessage = {
    event,
    data,
    target: "user",
    targetId: userId,
  };

  const manager = getSSEManager();
  manager.sendMessage(message);
}

/**
 * Send a message to a specific session
 */
export function sendToSession(
  sessionId: string,
  event: string,
  data: any,
): void {
  const message: SSEMessage = {
    event,
    data,
    target: "session",
    targetId: sessionId,
  };

  const manager = getSSEManager();
  manager.sendMessage(message);
}

/**
 * Send a message to a specific client
 */
export function sendToClient(clientId: string, event: string, data: any): void {
  const message: SSEMessage = {
    event,
    data,
    target: "client",
    targetId: clientId,
  };

  const manager = getSSEManager();
  manager.sendMessage(message);
}

/**
 * Send a custom message with full control over targeting
 */
export function sendMessage(message: SSEMessage): void {
  const manager = getSSEManager();
  manager.sendMessage(message);
}

/**
 * Get SSE connection statistics
 */
export function getSSEStats() {
  const manager = getSSEManager();
  return manager.getStats();
}

/**
 * Cleanup SSE resources
 */
export function destroySSE(): void {
  if (sseManager) {
    sseManager.destroy();
    sseManager = null;
    sseLogger.info("Service destroyed");
  }
}

/**
 * Utility function to generate a unique client ID
 */
export function generateClientId(): string {
  return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
