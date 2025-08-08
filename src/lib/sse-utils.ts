import { SSE } from "./sse";

/**
 * Utility functions for easy SSE integration in backend modules
 */

export interface NotificationData {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  actionUrl?: string;
  timestamp?: string;
}

export interface UpdateData {
  entity: string;
  entityId: string;
  changes: Record<string, any>;
  timestamp?: string;
}

export interface AlertData {
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  category?: string;
  actionRequired?: boolean;
  timestamp?: string;
}

/**
 * Send a notification to a specific user
 */
export function notifyUser(
  userId: string,
  notification: NotificationData,
): number {
  return SSE.toUser(userId, "notification", {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
  });
}

/**
 * Send a notification to all connected users
 */
export function notifyAll(notification: NotificationData): number {
  return SSE.broadcast("notification", {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
  });
}

/**
 * Send an update event to a specific user
 */
export function updateUser(userId: string, update: UpdateData): number {
  return SSE.toUser(userId, "update", {
    ...update,
    timestamp: update.timestamp || new Date().toISOString(),
  });
}

/**
 * Send an update event to all users
 */
export function updateAll(update: UpdateData): number {
  return SSE.broadcast("update", {
    ...update,
    timestamp: update.timestamp || new Date().toISOString(),
  });
}

/**
 * Send an alert to a specific user
 */
export function alertUser(userId: string, alert: AlertData): number {
  return SSE.toUser(userId, "alert", {
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString(),
  });
}

/**
 * Send an alert to all users
 */
export function alertAll(alert: AlertData): number {
  return SSE.broadcast("alert", {
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString(),
  });
}

/**
 * Send a custom event to a specific user
 */
export function sendCustomEventToUser(
  userId: string,
  eventName: string,
  data: any,
): number {
  return SSE.toUser(userId, eventName, {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  });
}

/**
 * Send a custom event to all users
 */
export function sendCustomEventToAll(eventName: string, data: any): number {
  return SSE.broadcast(eventName, {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  });
}

/**
 * Send a session-specific event
 */
export function sendToSession(
  sessionId: string,
  eventName: string,
  data: any,
): number {
  return SSE.toSession(sessionId, eventName, {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  });
}

/**
 * Send a client-specific event
 */
export function sendToClient(
  clientId: string,
  eventName: string,
  data: any,
): boolean {
  return SSE.toClient(clientId, eventName, {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  });
}

/**
 * Get current connection statistics
 */
export function getConnectionStats() {
  return SSE.getStats();
}

/**
 * Example usage in webhook handlers
 */
export const WebhookHelpers = {
  /**
   * Handle payment success webhook
   */
  handlePaymentSuccess: (paymentData: any) => {
    notifyUser(paymentData.userId, {
      title: "Payment Successful",
      message: `Your payment of $${paymentData.amount} has been processed successfully.`,
      type: "success",
      actionUrl: `/payments/${paymentData.id}`,
    });
  },

  /**
   * Handle order status update
   */
  handleOrderUpdate: (orderData: any) => {
    updateUser(orderData.userId, {
      entity: "order",
      entityId: orderData.id,
      changes: {
        status: orderData.status,
        updatedAt: orderData.updatedAt,
      },
    });
  },

  /**
   * Handle system maintenance alert
   */
  handleMaintenanceAlert: (maintenanceData: any) => {
    alertAll({
      message: `Scheduled maintenance in ${maintenanceData.minutesUntil} minutes. Expected duration: ${maintenanceData.duration}.`,
      severity: "medium",
      category: "maintenance",
      actionRequired: false,
    });
  },
};

/**
 * Example usage in job processors
 */
export const JobHelpers = {
  /**
   * Handle file upload completion
   */
  handleUploadComplete: (uploadData: any) => {
    notifyUser(uploadData.userId, {
      title: "Upload Complete",
      message: `Your file "${uploadData.fileName}" has been uploaded successfully.`,
      type: "success",
      actionUrl: `/files/${uploadData.fileId}`,
    });
  },

  /**
   * Handle processing job completion
   */
  handleProcessingComplete: (jobData: any) => {
    updateUser(jobData.userId, {
      entity: "job",
      entityId: jobData.id,
      changes: {
        status: "completed",
        result: jobData.result,
        completedAt: jobData.completedAt,
      },
    });
  },
};

/**
 * Example usage in database change handlers
 */
export const DatabaseHelpers = {
  /**
   * Handle user profile update
   */
  handleUserUpdate: (userId: string, changes: Record<string, any>) => {
    updateUser(userId, {
      entity: "user",
      entityId: userId,
      changes,
    });
  },

  /**
   * Handle new comment notification
   */
  handleNewComment: (commentData: any) => {
    notifyUser(commentData.postAuthorId, {
      title: "New Comment",
      message: `${commentData.authorName} commented on your post.`,
      type: "info",
      actionUrl: `/posts/${commentData.postId}#comment-${commentData.id}`,
    });
  },
};
