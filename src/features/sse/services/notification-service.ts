import { getSSEManager } from './sse-instance';
import type { SSENotification, SSENotificationTarget, SSEEvent } from '../types';

export class SSENotificationService {
  private static instance: SSENotificationService;
  private sseManager = getSSEManager();

  private constructor() {}

  static getInstance(): SSENotificationService {
    if (!SSENotificationService.instance) {
      SSENotificationService.instance = new SSENotificationService();
    }
    return SSENotificationService.instance;
  }

  /**
   * Send a notification to specific users
   */
  notifyUsers(userIds: string[], event: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): number {
    let totalSent = 0;
    
    for (const userId of userIds) {
      const notification: SSENotification = {
        event,
        data,
        target: { userId },
        priority,
      };
      
      totalSent += this.sseManager.sendNotification(notification);
    }
    
    return totalSent;
  }

  /**
   * Send a notification to specific sessions
   */
  notifySessions(sessionIds: string[], event: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): number {
    let totalSent = 0;
    
    for (const sessionId of sessionIds) {
      const notification: SSENotification = {
        event,
        data,
        target: { sessionId },
        priority,
      };
      
      totalSent += this.sseManager.sendNotification(notification);
    }
    
    return totalSent;
  }

  /**
   * Send a notification to specific clients
   */
  notifyClients(clientIds: string[], event: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): number {
    let totalSent = 0;
    
    for (const clientId of clientIds) {
      const notification: SSENotification = {
        event,
        data,
        target: { clientId },
        priority,
      };
      
      totalSent += this.sseManager.sendNotification(notification);
    }
    
    return totalSent;
  }

  /**
   * Broadcast a notification to all connected clients
   */
  broadcast(event: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): number {
    const notification: SSENotification = {
      event,
      data,
      target: { broadcast: true },
      priority,
    };
    
    return this.sseManager.sendNotification(notification);
  }

  /**
   * Send a custom event with full control
   */
  sendCustomEvent(event: SSEEvent, target: SSENotificationTarget): number {
    return this.sseManager.sendEvent(event, target);
  }

  /**
   * Send a system notification (high priority)
   */
  sendSystemNotification(message: string, target: SSENotificationTarget = { broadcast: true }): number {
    const notification: SSENotification = {
      event: 'system',
      data: { message, timestamp: new Date().toISOString() },
      target,
      priority: 'high',
    };
    
    return this.sseManager.sendNotification(notification);
  }

  /**
   * Send an error notification
   */
  sendErrorNotification(error: string, target: SSENotificationTarget = { broadcast: true }): number {
    const notification: SSENotification = {
      event: 'error',
      data: { error, timestamp: new Date().toISOString() },
      target,
      priority: 'high',
    };
    
    return this.sseManager.sendNotification(notification);
  }

  /**
   * Send a success notification
   */
  sendSuccessNotification(message: string, target: SSENotificationTarget = { broadcast: true }): number {
    const notification: SSENotification = {
      event: 'success',
      data: { message, timestamp: new Date().toISOString() },
      target,
      priority: 'normal',
    };
    
    return this.sseManager.sendNotification(notification);
  }

  /**
   * Send a user-specific notification
   */
  sendUserNotification(userId: string, event: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): number {
    const notification: SSENotification = {
      event,
      data,
      target: { userId },
      priority,
    };
    
    return this.sseManager.sendNotification(notification);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.sseManager.getMetrics().totalConnections,
      activeConnections: this.sseManager.getMetrics().activeConnections,
      totalEventsSent: this.sseManager.getMetrics().totalEventsSent,
    };
  }

  /**
   * Check if a user has active connections
   */
  isUserConnected(userId: string): boolean {
    return this.sseManager.getClientCountByUser(userId) > 0;
  }

  /**
   * Check if a session has active connections
   */
  isSessionConnected(sessionId: string): boolean {
    return this.sseManager.getClientCountBySession(sessionId) > 0;
  }
}

// Export singleton instance
export const sseNotificationService = SSENotificationService.getInstance();
