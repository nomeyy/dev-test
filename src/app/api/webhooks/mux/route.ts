import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { muxWebhookService } from "@/features/mux";
import {
  sendNotificationToUser,
  broadcastSSEMessage,
} from "../../../../features/sse/utils/sse-utils";

/**
 * Handles incoming Mux webhook events
 * This endpoint processes video-related events from Mux's webhook system
 * and sends real-time notifications via SSE
 *
 * @param request The incoming HTTP request from Mux's servers
 * @returns HTTP response indicating success or failure
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const body = await request.text();
    const event = await muxWebhookService.verifyWebhookEvent(body, headersList);

    switch (event.type) {
      // Upload-related events
      case "video.upload.created":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send notification to user about upload start
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Upload Started",
            "Your video upload has begun processing",
            "info",
          );
        }
        break;

      case "video.upload.asset_created":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send notification about asset creation
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Asset Created",
            "Your video asset has been created and is being processed",
            "info",
          );
        }
        break;

      case "video.upload.cancelled":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send notification about upload cancellation
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Upload Cancelled",
            "Your video upload was cancelled",
            "warning",
          );
        }
        break;

      case "video.upload.errored":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send notification about upload error
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Upload Failed",
            "There was an error processing your video upload",
            "error",
          );
        }
        break;

      // Asset-related events
      case "video.asset.created":
        console.info(`Asset event: ${event.type}`, event.data);
        // Send notification about asset creation
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Video Asset Created",
            "Your video asset has been created and is being prepared",
            "info",
          );
        }
        break;

      case "video.asset.updated":
        console.info(`Asset event: ${event.type}`, event.data);
        // Send notification about asset update
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Video Updated",
            "Your video has been updated with new settings",
            "info",
          );
        }
        break;

      case "video.asset.ready":
        console.info(`Asset ready event: ${event.type}`, event.data);
        // Send notification about asset being ready for playback
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Video Ready!",
            "Your video is now ready for playback",
            "success",
          );
        }
        // Also broadcast to all users about new content (optional)
        await broadcastSSEMessage("new_video_available", {
          assetId: event.data.id,
          playbackId: event.data.playback_ids?.[0]?.id,
          timestamp: Date.now(),
        });
        break;

      case "video.asset.deleted":
        console.info(`Asset event: ${event.type}`, event.data);
        // Send notification about asset deletion
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Video Deleted",
            "Your video has been deleted",
            "warning",
          );
        }
        break;

      case "video.asset.errored":
        console.info(`Asset issue event: ${event.type}`, event.data);
        // Send notification about asset error
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Video Processing Error",
            "There was an error processing your video. Please try uploading again.",
            "error",
          );
        }
        break;

      // For any unhandled event types
      default:
        console.warn(`Unhandled webhook type: ${event.type}`, event.data);
        // Send a generic notification for unhandled events
        if (event.data.user_id) {
          await sendNotificationToUser(
            event.data.user_id,
            "Video Update",
            `Your video status has been updated: ${event.type}`,
            "info",
          );
        }
        break;
    }

    return Response.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
