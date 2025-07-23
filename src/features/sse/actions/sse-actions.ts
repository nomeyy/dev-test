"use server";

import { sseNotifications } from "../services/sse-notification-service";
import { logger } from "@/utils/logging";

export async function sendTestNotification(userId: string) {
  try {
    const sentCount = await sseNotifications.notifyUser(
      userId,
      "notification",
      {
        title: "Test Notification",
        message: "This is a test notification sent from the server",
        type: "info",
        id: `test-${Date.now()}`,
      },
    );

    logger.info("SSE-Action", `Test notification sent to user ${userId}`, {
      sentCount,
    });
    return { success: true, sentCount };
  } catch (error) {
    logger.error(
      "SSE-Action",
      `Failed to send test notification to user ${userId}`,
      error,
    );
    return { success: false, error: "Failed to send notification" };
  }
}

export async function sendSystemAlert(
  title: string,
  message: string,
  level: "info" | "warning" | "error" = "info",
) {
  try {
    const sentCount = await sseNotifications.sendSystemAlert(
      title,
      message,
      level,
    );

    logger.info("SSE-Action", "System alert sent", { title, level, sentCount });
    return { success: true, sentCount };
  } catch (error) {
    logger.error("SSE-Action", "Failed to send system alert", error);
    return { success: false, error: "Failed to send system alert" };
  }
}

export async function sendStatusUpdate(
  userId: string,
  status: string,
  details?: any,
) {
  try {
    const sentCount = await sseNotifications.sendStatusUpdate(
      userId,
      status,
      details,
    );

    logger.info("SSE-Action", `Status update sent to user ${userId}`, {
      status,
      sentCount,
    });
    return { success: true, sentCount };
  } catch (error) {
    logger.error(
      "SSE-Action",
      `Failed to send status update to user ${userId}`,
      error,
    );
    return { success: false, error: "Failed to send status update" };
  }
}

export async function sendDataSyncNotification(
  userId: string,
  entity: string,
  action: "created" | "updated" | "deleted",
  entityId: string,
  data?: any,
) {
  try {
    const sentCount = await sseNotifications.sendDataSync(
      userId,
      entity,
      action,
      entityId,
      data,
    );

    logger.info("SSE-Action", `Data sync notification sent to user ${userId}`, {
      entity,
      action,
      entityId,
      sentCount,
    });
    return { success: true, sentCount };
  } catch (error) {
    logger.error(
      "SSE-Action",
      `Failed to send data sync notification to user ${userId}`,
      error,
    );
    return { success: false, error: "Failed to send data sync notification" };
  }
}

export async function getSSEStats() {
  try {
    const stats = sseNotifications.getStats();
    return { success: true, stats };
  } catch (error) {
    logger.error("SSE-Action", "Failed to get SSE stats", error);
    return { success: false, error: "Failed to get SSE stats" };
  }
}

export async function checkUserConnections(userId: string) {
  try {
    const hasConnections = sseNotifications.hasUserConnections(userId);
    const clientIds = sseNotifications.getUserClientIds(userId);

    return {
      success: true,
      hasConnections,
      clientIds,
      connectionCount: clientIds.length,
    };
  } catch (error) {
    logger.error(
      "SSE-Action",
      `Failed to check connections for user ${userId}`,
      error,
    );
    return { success: false, error: "Failed to check user connections" };
  }
}
