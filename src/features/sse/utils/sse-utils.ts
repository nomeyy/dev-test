import { getSSEManager } from "../services/sse-manager";
import type { SSEEvent, SendEventOptions } from "../types";
import { logger } from "@/utils/logging";

/**
 * Utility functions for backend modules to send SSE events
 */

/**
 * Send a notification event to specific user(s) or broadcast to all
 */
export async function sendNotification(
  message: string,
  options: {
    userId?: string;
    title?: string;
    type?: "info" | "success" | "warning" | "error";
    action?: {
      label: string;
      url: string;
    };
  } & SendEventOptions, // Remove the Omit to allow broadcast
): Promise<number> {
  const event: SSEEvent = {
    type: "notification",
    data: {
      message,
      title: options.title,
      type: options.type ?? "info",
      action: options.action,
      timestamp: Date.now(),
    },
  };

  const sseManager = getSSEManager();
  return await sseManager.sendEvent(event, {
    userId: options.userId,
    connectionId: options.connectionId,
    sessionId: options.sessionId,
    broadcast: options.broadcast, // Add broadcast support
  });
}

/**
 * Send a real-time data update
 */
export async function sendDataUpdate(
  dataType: string,
  data: Record<string, unknown>,
  options: SendEventOptions = {},
): Promise<number> {
  const event: SSEEvent = {
    type: "data_update",
    data: {
      dataType,
      payload: data,
      timestamp: Date.now(),
    },
  };

  const sseManager = getSSEManager();
  return await sseManager.sendEvent(event, options);
}

/**
 * Send progress update for long-running operations
 */
export async function sendProgressUpdate(
  operationId: string,
  progress: {
    percentage: number;
    message?: string;
    stage?: string;
    estimatedTimeRemaining?: number;
  },
  options: SendEventOptions = {},
): Promise<number> {
  const event: SSEEvent = {
    type: "progress_update",
    data: {
      operationId,
      progress: {
        ...progress,
        timestamp: Date.now(),
      },
    },
  };

  const sseManager = getSSEManager();
  return await sseManager.sendEvent(event, options);
}

/**
 * Send system status update
 */
export async function sendSystemStatus(
  status: {
    type: "maintenance" | "outage" | "update" | "info";
    message: string;
    severity?: "low" | "medium" | "high" | "critical";
    affectedServices?: string[];
    estimatedDuration?: number;
  },
  options: SendEventOptions = {},
): Promise<number> {
  const event: SSEEvent = {
    type: "system_status",
    data: {
      ...status,
      timestamp: Date.now(),
    },
  };

  const sseManager = getSSEManager();
  return await sseManager.sendEvent(event, options);
}

/**
 * Send user activity event
 */
export async function sendUserActivity(
  activityType: string,
  activityData: Record<string, unknown>,
  options: SendEventOptions = {},
): Promise<number> {
  const event: SSEEvent = {
    type: "user_activity",
    data: {
      activityType,
      data: activityData,
      timestamp: Date.now(),
    },
  };

  const sseManager = getSSEManager();
  return await sseManager.sendEvent(event, options);
}

/**
 * Send custom event with flexible payload
 */
export async function sendCustomEvent(
  eventType: string,
  payload: any,
  options: SendEventOptions = {},
): Promise<number> {
  const event: SSEEvent = {
    type: eventType,
    data: {
      ...payload,
      timestamp: Date.now(),
    },
  };

  const sseManager = getSSEManager();
  return await sseManager.sendEvent(event, options);
}

/**
 * Broadcast event to all connected clients
 */
export async function broadcastEvent(
  eventType: string,
  payload: any,
): Promise<number> {
  return await sendCustomEvent(eventType, payload, { broadcast: true });
}

/**
 * Send notification to all connected clients (broadcast notification)
 */
export async function broadcastNotification(
  message: string,
  options: {
    title?: string;
    type?: "info" | "success" | "warning" | "error";
    action?: {
      label: string;
      url: string;
    };
  } = {},
): Promise<number> {
  return await sendNotification(message, {
    ...options,
    broadcast: true,
  });
}

/**
 * Send data update to all connected clients (broadcast data)
 */
export async function broadcastDataUpdate(
  dataType: string,
  data: Record<string, unknown>,
): Promise<number> {
  return await sendDataUpdate(dataType, data, { broadcast: true });
}

/**
 * Get SSE connection statistics
 */
export function getConnectionStats() {
  const sseManager = getSSEManager();
  return sseManager.getStats();
}

/**
 * High-level wrapper for webhook handlers to send events
 */
export class SSEWebhookNotifier {
  constructor(private defaultUserId?: string) {}

  async notifyWebhookEvent(
    webhookType: string,
    eventData: any,
    userId?: string,
  ): Promise<number> {
    const targetUserId = userId || this.defaultUserId;

    if (!targetUserId) {
      logger.warn("No userId provided for webhook notification", webhookType);
      return 0;
    }

    return await sendCustomEvent(
      `webhook_${webhookType}`,
      {
        webhook: webhookType,
        data: eventData,
      },
      { userId: targetUserId },
    );
  }

  async notifyProcessingComplete(
    processType: string,
    result: any,
    userId?: string,
  ): Promise<number> {
    const targetUserId = userId || this.defaultUserId;

    if (!targetUserId) {
      logger.warn(
        "No userId provided for processing complete notification",
        processType,
      );
      return 0;
    }

    return await sendNotification(
      `${processType} processing completed successfully`,
      {
        userId: targetUserId,
        title: "Processing Complete",
        type: "success",
        // You can add custom action buttons
        // action: {
        //   label: "View Result",
        //   url: `/results/${result.id}`
        // }
      },
    );
  }

  async notifyProcessingError(
    processType: string,
    error: string,
    userId?: string,
  ): Promise<number> {
    const targetUserId = userId || this.defaultUserId;

    if (!targetUserId) {
      logger.warn(
        "No userId provided for processing error notification",
        processType,
      );
      return 0;
    }

    return await sendNotification(
      `${processType} processing failed: ${error}`,
      {
        userId: targetUserId,
        title: "Processing Error",
        type: "error",
      },
    );
  }
}
