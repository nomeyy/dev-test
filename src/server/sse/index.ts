import { InMemoryBus /*, RedisBus */ } from "./bus";
import { ConnectionManager } from "./manager";
import type { SseStats, ConnectionInfo } from "./types";
import { log } from "@/lib/logger";

// For prod fan-out: create ioredis pub/sub clients and pass into RedisBus.
const bus = new InMemoryBus();
export const sse = new ConnectionManager(bus);

/**
 * Core SSE API functions for sending events to clients
 */

// Send to specific user (all their connections)
export const notifyUser = (userId: string, event: string, data: any) => 
  sse.send({ type: "user", userId }, event, data);

// Send to specific session (single browser tab)
export const notifySession = (sessionId: string, event: string, data: any) => 
  sse.send({ type: "session", sessionId }, event, data);

// Send to all clients subscribed to a topic
export const notifyTopic = (topic: string, event: string, data: any) => 
  sse.send({ type: "topic", topic }, event, data);

// Broadcast to all connected clients
export const broadcast = (event: string, data: any) => 
  sse.send({ type: "broadcast" }, event, data);

// Send to a specific connection
export const notifyConnection = (connId: string, event: string, data: any) =>
  sse.sendToConnection(connId, event, data);

/**
 * Utility functions for common notification patterns
 */

// Notify user about a new message
export const notifyNewMessage = (userId: string, message: any) => {
  return notifyUser(userId, "new_message", {
    message,
    timestamp: Date.now()
  });
};

// Notify about system updates
export const notifySystemUpdate = (event: string, data: any) => {
  return broadcast("system_update", {
    event,
    data,
    timestamp: Date.now()
  });
};

// Notify about user status changes
export const notifyUserStatus = (userId: string, status: string) => {
  return notifyUser(userId, "status_change", {
    status,
    timestamp: Date.now()
  });
};

// Notify about real-time updates (e.g., live data)
export const notifyLiveUpdate = (topic: string, data: any) => {
  return notifyTopic(topic, "live_update", {
    data,
    timestamp: Date.now()
  });
};

/**
 * Management and monitoring functions
 */

// Get connection statistics
export const getStats = (): SseStats => sse.getStats();

// Get information about a specific connection
export const getConnectionInfo = (connId: string): ConnectionInfo | null => 
  sse.getConnectionInfo(connId);

// Get all connections for a user
export const getUserConnections = (userId: string): ConnectionInfo[] => 
  sse.getConnectionsByUser(userId);

// Get all connections for a topic
export const getTopicConnections = (topic: string): ConnectionInfo[] => 
  sse.getConnectionsByTopic(topic);

// Clean up all connections (useful for graceful shutdown)
export const cleanup = async () => {
  log.info("Starting SSE cleanup");
  await sse.cleanup();
  log.info("SSE cleanup completed");
};

/**
 * Health check function
 */
export const healthCheck = () => {
  const stats = getStats();
  return {
    status: "healthy",
    uptime: stats.uptime,
    activeConnections: stats.activeConnections,
    totalConnections: stats.totalConnections,
    totalEventsSent: stats.totalEventsSent,
    totalErrors: stats.totalErrors
  };
};
