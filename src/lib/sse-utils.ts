// lib/sse-utils.ts
import { unifiedSSEService } from "../features/sse/unified-sse-service";
import { logger } from "@/utils/logging";

const utilsLogger = logger.createContextLogger("SSE-Utils");

/**
 * High-level utility functions for backend modules to send SSE notifications
 * without dealing with SSE protocol details.
 */

export interface NotificationOptions {
  priority?: "low" | "normal" | "high";
  persistent?: boolean;
  ttl?: number;
  metadata?: Record<string, any>;
}

export interface UserNotification {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  options?: NotificationOptions;
}

export interface SystemAlert {
  level: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  source?: string;
  options?: NotificationOptions;
}

// ============================================================================
// System Alerts & Broadcasts
// ============================================================================

/**
 * Broadcast a system-wide alert to all connected clients
 */
export async function broadcastSystemAlert(
  alert: SystemAlert,
): Promise<number> {
  try {
    const eventData = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level: alert.level,
      title: alert.title,
      message: alert.message,
      source: alert.source || "system",
      timestamp: new Date().toISOString(),
      priority:
        alert.options?.priority ||
        (alert.level === "critical" ? "high" : "normal"),
      metadata: alert.options?.metadata || {},
    };

    const deliveredCount = await unifiedSSEService.broadcast(
      "system-alert",
      eventData,
    );

    utilsLogger.info(`System alert broadcasted`, {
      level: alert.level,
      deliveredCount,
      source: alert.source,
    });

    return deliveredCount;
  } catch (error) {
    utilsLogger.error("Failed to broadcast system alert", error);
    return 0;
  }
}

// ============================================================================
// Real-time Updates
// ============================================================================

/**
 * Broadcast real-time data to all clients (e.g., live stats, prices)
 */
export async function broadcastDataUpdate(
  dataType: string,
  data: any,
  options?: NotificationOptions,
): Promise<number> {
  try {
    const eventData = {
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataType,
      data,
      timestamp: new Date().toISOString(),
      metadata: options?.metadata || {},
    };

    const deliveredCount = await unifiedSSEService.broadcast(
      "data-update",
      eventData,
    );

    utilsLogger.info(`Data update broadcasted`, {
      dataType,
      deliveredCount,
    });

    return deliveredCount;
  } catch (error) {
    utilsLogger.error("Failed to broadcast data update", error);
    return 0;
  }
}

// ============================================================================
// Webhook Integration Helpers
// ============================================================================

/**
 * Helper for webhook handlers to easily send notifications
 */
export async function handleWebhookNotification(webhookData: {
  userId?: string;
  sessionId?: string;
  broadcast?: boolean;
  event: string;
  data: any;
  persistent?: boolean;
}): Promise<{
  success: boolean;
  deliveredCount: number;
  message: string;
}> {
  try {
    let deliveredCount = 0;
    if (webhookData.broadcast) {
      deliveredCount = await unifiedSSEService.broadcast(
        webhookData.event,
        webhookData.data,
      );
    }
    const success = deliveredCount > 0 || webhookData.persistent;

    return {
      success,
      deliveredCount,
      message: success
        ? `Event sent successfully (${deliveredCount} recipients)`
        : "No recipients found and event not queued",
    };
  } catch (error) {
    utilsLogger.error("Webhook notification failed", error);
    return {
      success: false,
      deliveredCount: 0,
      message: "Failed to process webhook notification",
    };
  }
}
