import { NextRequest } from "next/server";
import {
  notifyUser,
  broadcast,
  realtimeUpdate,
  progressUpdate,
  successNotification,
} from "@/features/sse";
import { logger } from "@/utils/logging";

// Example webhook that demonstrates SSE integration
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { eventType, userId, data } = body;

    logger.info("Webhook", "Received webhook event", { eventType, userId });

    switch (eventType) {
      case "user.profile.updated":
        // Notify the specific user about their profile update
        notifyUser(userId, {
          event: "profile_updated",
          data: {
            message: "Your profile has been updated successfully",
            changes: data.changes,
            timestamp: new Date().toISOString(),
          },
        });
        break;

      case "system.maintenance":
        // Broadcast system maintenance notification to all users
        broadcast({
          event: "maintenance",
          data: {
            message: "System maintenance scheduled",
            maintenanceWindow: data.maintenanceWindow,
            affectedServices: data.affectedServices,
            timestamp: new Date().toISOString(),
          },
        });
        break;

      case "upload.progress":
        // Send progress updates for file uploads
        progressUpdate(
          data.uploadId,
          data.progress,
          `Uploading ${data.filename}...`,
          userId,
        );
        break;

      case "upload.completed":
        // Notify user when upload is complete
        successNotification(
          `File "${data.filename}" uploaded successfully`,
          {
            fileId: data.fileId,
            fileUrl: data.fileUrl,
            fileSize: data.fileSize,
          },
          userId,
        );
        break;

      case "content.published":
        // Real-time update for new content
        realtimeUpdate(
          "content",
          {
            id: data.contentId,
            title: data.title,
            type: data.type,
            author: data.author,
          },
          data.subscriberIds, // Notify specific subscribers
        );
        break;

      case "notification.new":
        // Send a general notification
        notifyUser(userId, {
          event: "notification",
          data: {
            id: data.notificationId,
            title: data.title,
            message: data.message,
            type: data.type || "info",
            actionUrl: data.actionUrl,
            timestamp: new Date().toISOString(),
          },
        });
        break;

      default:
        logger.warn("Webhook", "Unknown event type", { eventType });
        return new Response("Unknown event type", { status: 400 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventType,
        processedAt: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    logger.error("Webhook", "Failed to process webhook", error);

    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
