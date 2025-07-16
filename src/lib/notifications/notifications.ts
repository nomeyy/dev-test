// lib/notifications/NotificationService.ts
import { sseManager } from '@/lib/sse/sseManager';
import type { SSEEvent } from '@/lib/sse/sseManager';

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp?: string;
}

class NotificationService {
  /**
   * Send notification to specific user
   */
  sendToUser(userId: string, notification: NotificationData): boolean {
    const event: SSEEvent = {
      type: 'notification',
      data: {
        ...notification,
        timestamp: notification.timestamp || new Date().toISOString(),
      },
    };

    const sentCount = sseManager.sendToUser(userId, event);
    return sentCount > 0;
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(notification: NotificationData): number {
    const event: SSEEvent = {
      type: 'notification',
      data: {
        ...notification,
        timestamp: notification.timestamp || new Date().toISOString(),
      },
    };

    return sseManager.broadcast(event);
  }
}

export const notificationService = new NotificationService();

export default NotificationService;