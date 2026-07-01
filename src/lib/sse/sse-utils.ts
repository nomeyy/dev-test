import { SSEEvent } from "./sse-service";

// Global SSE manager instance - will be set when the service is initialized
let sseManager: any = null;

/**
 * Set the global SSE manager instance
 * This should be called once when the SSE service is initialized
 */
export function setSSEManager(manager: any) {
  sseManager = manager;
}

/**
 * Get the global SSE manager instance
 */
export function getSSEManager() {
  if (!sseManager) {
    throw new Error("SSE Manager not initialized. Call setSSEManager() first.");
  }
  return sseManager;
}

/**
 * Utility function to create SSE events with consistent structure
 */
export function createSSEEvent(
  type: string,
  data: any,
  metadata?: Record<string, any>,
): SSEEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

/**
 * Send a notification to a specific client
 */
export function notifyClient(
  clientId: string,
  type: string,
  data: any,
  metadata?: Record<string, any>,
): boolean {
  try {
    const manager = getSSEManager();
    const event = createSSEEvent(type, data, metadata);
    return manager.sendToClient(clientId, event);
  } catch (error) {
    console.error("Failed to notify client:", error);
    return false;
  }
}

/**
 * Send a notification to a specific user (across all their connections)
 */
export function notifyUser(
  userId: string,
  type: string,
  data: any,
  metadata?: Record<string, any>,
): number {
  try {
    const manager = getSSEManager();
    const event = createSSEEvent(type, data, metadata);
    return manager.sendToUser(userId, event);
  } catch (error) {
    console.error("Failed to notify user:", error);
    return 0;
  }
}

/**
 * Send a notification to all clients in a specific channel
 */
export function notifyChannel(
  channel: string,
  type: string,
  data: any,
  metadata?: Record<string, any>,
): number {
  try {
    const manager = getSSEManager();
    const event = createSSEEvent(type, data, metadata);
    return manager.sendToChannel(channel, event);
  } catch (error) {
    console.error("Failed to notify channel:", error);
    return 0;
  }
}

/**
 * Broadcast a notification to all connected clients
 */
export function broadcastNotification(
  type: string,
  data: any,
  metadata?: Record<string, any>,
): number {
  try {
    const manager = getSSEManager();
    const event = createSSEEvent(type, data, metadata);
    return manager.broadcast(event);
  } catch (error) {
    console.error("Failed to broadcast notification:", error);
    return 0;
  }
}

/**
 * Send a system notification (with system metadata)
 */
export function sendSystemNotification(
  type: string,
  data: any,
  target: "all" | "channel" | "user" | "client" = "all",
  targetId?: string,
): boolean | number {
  const metadata = {
    ...data.metadata,
    system: true,
    source: "system",
  };

  switch (target) {
    case "client":
      if (!targetId)
        throw new Error("Client ID required for client-targeted notifications");
      return notifyClient(targetId, type, data, metadata);

    case "user":
      if (!targetId)
        throw new Error("User ID required for user-targeted notifications");
      return notifyUser(targetId, type, data, metadata);

    case "channel":
      if (!targetId)
        throw new Error(
          "Channel name required for channel-targeted notifications",
        );
      return notifyChannel(targetId, type, data, metadata);

    case "all":
    default:
      return broadcastNotification(type, data, metadata);
  }
}

/**
 * Send a webhook notification (with webhook metadata)
 */
export function sendWebhookNotification(
  webhookType: string,
  data: any,
  target: "all" | "channel" | "user" | "client" = "all",
  targetId?: string,
): boolean | number {
  const metadata = {
    ...data.metadata,
    webhook: true,
    webhookType,
    source: "webhook",
  };

  return sendSystemNotification(webhookType, data, target, targetId);
}

/**
 * Send a job completion notification
 */
export function sendJobNotification(
  jobId: string,
  status: "started" | "completed" | "failed" | "progress",
  data: any,
  target: "all" | "channel" | "user" | "client" = "all",
  targetId?: string,
): boolean | number {
  const metadata = {
    ...data.metadata,
    job: true,
    jobId,
    status,
    source: "job-processor",
  };

  return sendSystemNotification(`job:${status}`, data, target, targetId);
}

/**
 * Send a real-time update notification
 */
export function sendRealtimeUpdate(
  entityType: string,
  entityId: string,
  action: "created" | "updated" | "deleted",
  data: any,
  target: "all" | "channel" | "user" | "client" = "all",
  targetId?: string,
): boolean | number {
  const metadata = {
    ...data.metadata,
    realtime: true,
    entityType,
    entityId,
    action,
    source: "realtime-update",
  };

  return sendSystemNotification(
    `realtime:${entityType}:${action}`,
    data,
    target,
    targetId,
  );
}

/**
 * Send a user activity notification
 */
export function sendUserActivityNotification(
  userId: string,
  activityType: string,
  data: any,
  target: "all" | "channel" | "user" | "client" = "all",
  targetId?: string,
): boolean | number {
  const metadata = {
    ...data.metadata,
    userActivity: true,
    activityType,
    source: "user-activity",
  };

  return sendSystemNotification(`user:${activityType}`, data, target, targetId);
}

/**
 * Check if SSE service is available
 */
export function isSSEAvailable(): boolean {
  return sseManager !== null;
}

/**
 * Get current connection statistics
 */
export function getConnectionStats() {
  try {
    const manager = getSSEManager();
    return manager.getConnections();
  } catch (error) {
    return { total: 0, clients: [] };
  }
}

/**
 * Check if a specific client is connected
 */
export function isClientConnected(clientId: string): boolean {
  try {
    const manager = getSSEManager();
    return manager.isClientConnected(clientId);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a specific user has any active connections
 */
export function isUserOnline(userId: string): boolean {
  try {
    const manager = getSSEManager();
    const userClients = manager.getUserClients(userId);
    return userClients.length > 0;
  } catch (error) {
    return false;
  }
}
