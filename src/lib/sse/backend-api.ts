/**
 * Backend Integration API for SSE Notifications
 *
 * This module provides a clean interface for backend modules (webhook handlers,
 * job processors, etc.) to send real-time notifications without managing
 * SSE protocol details.
 *
 * Usage Examples:
 *
 * // Send a webhook notification
 * import { sendWebhookNotification } from '@/lib/sse/backend-api';
 *
 * sendWebhookNotification('payment:completed', {
 *   orderId: '12345',
 *   amount: 99.99,
 *   customer: 'john@example.com'
 * }, 'user', 'user123');
 *
 * // Send a job completion notification
 * import { sendJobNotification } from '@/lib/sse/backend-api';
 *
 * sendJobNotification('video-processing', 'completed', {
 *   videoId: 'video123',
 *   duration: '2:30',
 *   quality: '1080p'
 * }, 'user', 'user456');
 *
 * // Send a real-time update
 * import { sendRealtimeUpdate } from '@/lib/sse/backend-api';
 *
 * sendRealtimeUpdate('post', 'post789', 'created', {
 *   title: 'New Blog Post',
 *   author: 'Jane Doe'
 * }, 'channel', 'general');
 */

import { SSEManager } from "./index";
import { logger } from "@/utils/logging";

// ============================================================================
// WEBHOOK NOTIFICATIONS
// ============================================================================

/**
 * Send a payment-related webhook notification
 */
export function sendPaymentNotification(
  paymentId: string,
  status: "pending" | "completed" | "failed" | "refunded",
  data: {
    amount: number;
    currency: string;
    customerId: string;
    orderId?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const webhookData = {
    paymentId,
    status,
    ...data,
    metadata: {
      ...data.metadata,
      category: "payment",
      priority: status === "failed" ? "high" : "normal",
    },
  };

  return SSEManager.sendWebhookNotification(
    `payment:${status}`,
    webhookData,
    target,
    targetId,
  );
}

/**
 * Send a user account webhook notification
 */
export function sendUserAccountNotification(
  userId: string,
  action: "created" | "updated" | "deleted" | "suspended" | "activated",
  data: {
    email: string;
    username?: string;
    reason?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const webhookData = {
    userId,
    action,
    ...data,
    metadata: {
      ...data.metadata,
      category: "user-account",
      priority:
        action === "deleted" || action === "suspended" ? "high" : "normal",
    },
  };

  return SSEManager.sendWebhookNotification(
    `user:${action}`,
    webhookData,
    target,
    targetId,
  );
}

/**
 * Send a system health webhook notification
 */
export function sendSystemHealthNotification(
  component: string,
  status: "healthy" | "warning" | "critical" | "offline",
  data: {
    message: string;
    metrics?: Record<string, any>;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "channel",
  targetId: string = "system-monitoring",
): boolean | number {
  const webhookData = {
    component,
    status,
    ...data,
    metadata: {
      ...data.metadata,
      category: "system-health",
      priority:
        status === "critical"
          ? "high"
          : status === "warning"
            ? "medium"
            : "low",
    },
  };

  return SSEManager.sendWebhookNotification(
    `system:${status}`,
    webhookData,
    target,
    targetId,
  );
}

// ============================================================================
// JOB PROCESSING NOTIFICATIONS
// ============================================================================

/**
 * Send a video processing job notification
 */
export function sendVideoProcessingNotification(
  videoId: string,
  status: "started" | "processing" | "completed" | "failed",
  data: {
    title?: string;
    duration?: string;
    quality?: string;
    progress?: number;
    error?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const jobData = {
    videoId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "video-processing",
      priority: status === "failed" ? "high" : "normal",
    },
  };

  return SSEManager.sendJobNotification(
    videoId,
    status,
    jobData,
    target,
    targetId,
  );
}

/**
 * Send a data export job notification
 */
export function sendDataExportNotification(
  exportId: string,
  status: "started" | "processing" | "completed" | "failed",
  data: {
    format: string;
    recordCount?: number;
    fileSize?: string;
    downloadUrl?: string;
    error?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const jobData = {
    exportId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "data-export",
      priority: status === "failed" ? "high" : "normal",
    },
  };

  return SSEManager.sendJobNotification(
    exportId,
    status,
    jobData,
    target,
    targetId,
  );
}

/**
 * Send a batch operation notification
 */
export function sendBatchOperationNotification(
  batchId: string,
  operation: string,
  status: "started" | "processing" | "completed" | "failed",
  data: {
    totalItems: number;
    processedItems: number;
    successCount: number;
    errorCount: number;
    errors?: string[];
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const jobData = {
    batchId,
    operation,
    ...data,
    metadata: {
      ...data.metadata,
      category: "batch-operation",
      priority: status === "failed" ? "high" : "normal",
    },
  };

  return SSEManager.sendJobNotification(
    batchId,
    status,
    jobData,
    target,
    targetId,
  );
}

// ============================================================================
// REAL-TIME ENTITY UPDATES
// ============================================================================

/**
 * Send a post/content update notification
 */
export function sendPostUpdateNotification(
  postId: string,
  action: "created" | "updated" | "deleted" | "published" | "unpublished",
  data: {
    title: string;
    author: string;
    category?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "channel",
  targetId: string = "content-updates",
): boolean | number {
  const updateData = {
    postId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "content",
      priority: action === "deleted" ? "high" : "normal",
    },
  };

  return SSEManager.sendRealtimeUpdate(
    "post",
    postId,
    action,
    updateData,
    target,
    targetId,
  );
}

/**
 * Send a user profile update notification
 */
export function sendProfileUpdateNotification(
  userId: string,
  action: "updated" | "avatar_changed" | "settings_changed",
  data: {
    username?: string;
    email?: string;
    avatarUrl?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const updateData = {
    userId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "profile",
      priority: "low",
    },
  };

  return SSEManager.sendRealtimeUpdate(
    "profile",
    userId,
    action,
    updateData,
    target,
    targetId,
  );
}

/**
 * Send a comment/interaction notification
 */
export function sendCommentNotification(
  commentId: string,
  action: "created" | "updated" | "deleted" | "liked" | "replied",
  data: {
    content: string;
    author: string;
    postId?: string;
    parentCommentId?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "channel",
  targetId: string = "interactions",
): boolean | number {
  const updateData = {
    commentId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "interaction",
      priority: action === "deleted" ? "high" : "normal",
    },
  };

  return SSEManager.sendRealtimeUpdate(
    "comment",
    commentId,
    action,
    updateData,
    target,
    targetId,
  );
}

// ============================================================================
// USER ACTIVITY NOTIFICATIONS
// ============================================================================

/**
 * Send a user login/logout notification
 */
export function sendUserSessionNotification(
  userId: string,
  action: "login" | "logout" | "session_expired" | "password_changed",
  data: {
    username: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const activityData = {
    userId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "session",
      priority: action === "password_changed" ? "high" : "low",
    },
  };

  return SSEManager.sendUserActivityNotification(
    userId,
    action,
    activityData,
    target,
    targetId,
  );
}

/**
 * Send a user achievement notification
 */
export function sendAchievementNotification(
  userId: string,
  achievement: string,
  data: {
    username: string;
    achievementName: string;
    description: string;
    points?: number;
    badgeUrl?: string;
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "user",
  targetId?: string,
): boolean | number {
  const activityData = {
    userId,
    ...data,
    metadata: {
      ...data.metadata,
      category: "achievement",
      priority: "medium",
    },
  };

  return SSEManager.sendUserActivityNotification(
    userId,
    achievement,
    activityData,
    target,
    targetId,
  );
}

// ============================================================================
// SYSTEM NOTIFICATIONS
// ============================================================================

/**
 * Send a maintenance notification
 */
export function sendMaintenanceNotification(
  type: "scheduled" | "emergency" | "completed",
  data: {
    title: string;
    description: string;
    startTime?: string;
    endTime?: string;
    affectedServices?: string[];
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "all",
): boolean | number {
  const systemData = {
    type,
    ...data,
    metadata: {
      ...data.metadata,
      category: "maintenance",
      priority: type === "emergency" ? "high" : "medium",
    },
  };

  return SSEManager.sendSystemNotification("maintenance", systemData, target);
}

/**
 * Send a security alert notification
 */
export function sendSecurityAlertNotification(
  severity: "low" | "medium" | "high" | "critical",
  data: {
    title: string;
    description: string;
    threatType: string;
    affectedUsers?: string[];
    recommendations?: string[];
    metadata?: Record<string, any>;
  },
  target: "all" | "channel" | "user" | "client" = "all",
): boolean | number {
  const systemData = {
    severity,
    ...data,
    metadata: {
      ...data.metadata,
      category: "security",
      priority:
        severity === "critical"
          ? "high"
          : severity === "high"
            ? "medium"
            : "low",
    },
  };

  return SSEManager.sendSystemNotification(
    "security:alert",
    systemData,
    target,
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Send a custom notification with full control over the event structure
 */
export function sendCustomNotification(
  eventType: string,
  data: any,
  target: "all" | "channel" | "user" | "client" = "all",
  targetId?: string,
  metadata?: Record<string, any>,
): boolean | number {
  const customData = {
    ...data,
    metadata: {
      ...metadata,
      category: "custom",
      priority: "normal",
    },
  };

  return SSEManager.sendSystemNotification(
    eventType,
    customData,
    target,
    targetId,
  );
}

/**
 * Send a notification to multiple users at once
 */
export function sendMultiUserNotification(
  userIds: string[],
  eventType: string,
  data: any,
  metadata?: Record<string, any>,
): { success: number; failed: number; total: number } {
  let success = 0;
  let failed = 0;

  userIds.forEach((userId) => {
    try {
      const result = SSEManager.sendToUser(userId, eventType, data, metadata);
      if (result > 0) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      logger.error("SSE", "Failed to send multi-user notification", {
        userId,
        eventType,
        error,
      });
    }
  });

  return { success, failed, total: userIds.length };
}

/**
 * Send a notification to multiple channels at once
 */
export function sendMultiChannelNotification(
  channels: string[],
  eventType: string,
  data: any,
  metadata?: Record<string, any>,
): { success: number; failed: number; total: number } {
  let success = 0;
  let failed = 0;

  channels.forEach((channel) => {
    try {
      const result = SSEManager.sendToChannel(
        channel,
        eventType,
        data,
        metadata,
      );
      if (result > 0) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      logger.error("SSE", "Failed to send multi-channel notification", {
        channel,
        eventType,
        error,
      });
    }
  });

  return { success, failed, total: channels.length };
}

// Export all functions for easy importing
export {
  SSEManager,
  sendPaymentNotification,
  sendUserAccountNotification,
  sendSystemHealthNotification,
  sendVideoProcessingNotification,
  sendDataExportNotification,
  sendBatchOperationNotification,
  sendPostUpdateNotification,
  sendProfileUpdateNotification,
  sendCommentNotification,
  sendUserSessionNotification,
  sendAchievementNotification,
  sendMaintenanceNotification,
  sendSecurityAlertNotification,
  sendCustomNotification,
  sendMultiUserNotification,
  sendMultiChannelNotification,
};
