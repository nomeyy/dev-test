import { sendToUser, broadcastToAll } from "../services/sse-service";
import { logger } from "@/utils/logging";

const sseLogger = logger.createContextLogger("SSE");

/**
 * Example: Webhook integration with SSE
 * This shows how to send real-time notifications when webhooks are received
 */

export async function handleMuxWebhook(payload: any) {
  try {
    // Process the webhook payload
    const { type, data } = payload;

    switch (type) {
      case "video.asset.ready":
        // Notify the user who uploaded the video
        if (data.userId) {
          sendToUser(data.userId, "video-ready", {
            assetId: data.assetId,
            status: "ready",
            message: "Your video is ready for viewing!",
            timestamp: Date.now(),
          });
        }
        break;

      case "video.asset.errored":
        // Notify the user about the error
        if (data.userId) {
          sendToUser(data.userId, "video-error", {
            assetId: data.assetId,
            error: data.error,
            message: "There was an error processing your video.",
            timestamp: Date.now(),
          });
        }
        break;

      default:
        // Broadcast to all connected clients for monitoring
        broadcastToAll("webhook-received", {
          type,
          data,
          timestamp: Date.now(),
        });
    }

    sseLogger.info("Webhook notification sent", { type, userId: data.userId });
  } catch (error) {
    sseLogger.error("Failed to send webhook notification", error);
  }
}

/**
 * Example: User activity notifications
 */
export function notifyUserActivity(
  userId: string,
  activity: string,
  data: any,
) {
  try {
    sendToUser(userId, "user-activity", {
      activity,
      data,
      timestamp: Date.now(),
    });

    sseLogger.info("User activity notification sent", { userId, activity });
  } catch (error) {
    sseLogger.error("Failed to send user activity notification", error);
  }
}

/**
 * Example: System-wide announcements
 */
export function sendSystemAnnouncement(
  message: string,
  priority: "low" | "medium" | "high" = "low",
) {
  try {
    broadcastToAll("system-announcement", {
      message,
      priority,
      timestamp: Date.now(),
    });

    sseLogger.info("System announcement sent", { message, priority });
  } catch (error) {
    sseLogger.error("Failed to send system announcement", error);
  }
}
