import { getSSEManager } from '../services/sse-instance';
import type { SSEEventPayload } from '../types/index';

/**
 * Send a notification to a specific user
 */
export function notifyUser(
  userId: string,
  event: string,
  data: any
): number {
  const manager = getSSEManager();
  return manager.sendToUser(userId, { event, data });
}

/**
 * Send a notification to all users in a session
 */
export function notifySession(
  sessionId: string,
  event: string,
  data: any
): number {
  const manager = getSSEManager();
  return manager.sendToSession(sessionId, { event, data });
}

/**
 * Send a notification to a specific client
 */
export function notifyClient(
  clientId: string,
  event: string,
  data: any
): boolean {
  const manager = getSSEManager();
  return manager.sendToClient(clientId, { event, data });
}

/**
 * Broadcast a notification to all connected clients
 */
export function broadcastNotification(
  event: string,
  data: any
): number {
  const manager = getSSEManager();
  return manager.broadcast({ event, data });
}

/**
 * Send a message based on targeting criteria
 */
export function sendSSEMessage(payload: SSEEventPayload): number {
  const manager = getSSEManager();
  return manager.sendMessage(payload);
}

/**
 * Get current SSE statistics
 */
export function getSSEStats() {
  const manager = getSSEManager();
  return manager.getStats();
}

/**
 * Get all active connections
 */
export function getActiveConnections() {
  const manager = getSSEManager();
  return manager.getConnections();
}

/**
 * Helper function to send real-time notifications for common events
 */
export const notifications = {
  /**
   * Send a user action notification (like, comment, etc.)
   */
  userAction: (
    targetUserId: string, 
    action: string, 
    actor: { id: string; name: string }, 
    resource?: { type: string; id: string; title?: string }
  ) => {
    return notifyUser(targetUserId, 'user-action', {
      action,
      actor,
      resource,
      timestamp: new Date(),
    });
  },

  /**
   * Send a system notification
   */
  system: (
    targetUserId: string, 
    message: string, 
    type: 'info' | 'warning' | 'error' | 'success' = 'info'
  ) => {
    return notifyUser(targetUserId, 'system-notification', {
      message,
      type,
      timestamp: new Date(),
    });
  },

  /**
   * Send a real-time update notification
   */
  update: (
    targetUserId: string, 
    resourceType: string, 
    resourceId: string, 
    changeType: 'created' | 'updated' | 'deleted',
    data?: any
  ) => {
    return notifyUser(targetUserId, 'resource-update', {
      resourceType,
      resourceId,
      changeType,
      data,
      timestamp: new Date(),
    });
  },

  /**
   * Send a chat message notification
   */
  chat: (
    sessionId: string, 
    message: { 
      id: string; 
      content: string; 
      sender: { id: string; name: string }; 
    }
  ) => {
    return notifySession(sessionId, 'chat-message', {
      ...message,
      timestamp: new Date(),
    });
  },

  /**
   * Send a typing indicator
   */
  typing: (
    sessionId: string, 
    userId: string, 
    userName: string, 
    isTyping: boolean
  ) => {
    return notifySession(sessionId, 'typing-indicator', {
      userId,
      userName,
      isTyping,
      timestamp: new Date(),
    });
  },

  /**
   * Send a broadcast announcement
   */
  announcement: (
    message: string, 
    type: 'maintenance' | 'feature' | 'alert' = 'feature',
    expiresAt?: Date
  ) => {
    return broadcastNotification('announcement', {
      message,
      type,
      expiresAt,
      timestamp: new Date(),
    });
  },
};
