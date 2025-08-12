import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { muxWebhookService } from "@/features/mux";
import { sseNotificationService } from "@/features/sse";

/**
 * Handles incoming Mux webhook events
 * This endpoint processes video-related events from Mux's webhook system
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
      case "video.upload.asset_created":
      case "video.upload.cancelled":
      case "video.upload.errored":
        // TODO: Handle upload events
        console.info(`Upload event: ${event.type}`, event.data);
        
        // Send SSE notification for upload events
        // Note: user_id would need to be added as metadata when creating the upload
        // For now, we'll skip user-specific notifications for Mux events
        // if (event.data?.metadata?.user_id) {
        //   sseNotificationService.sendUserNotification(
        //     event.data.metadata.user_id,
        //     'video_upload_update',
        //     {
        //       type: event.type,
        //       status: event.type.includes('created') ? 'processing' : 
        //              event.type.includes('cancelled') ? 'cancelled' : 'error',
        //       data: event.data,
        //       timestamp: new Date().toISOString(),
        //     }
        //   );
        // }
        break;

      // Asset-related events
      case "video.asset.created":
      case "video.asset.updated":
      case "video.asset.ready":
        // TODO: Handle asset ready for playback
        console.info(`Asset ready event: ${event.type}`, event.data);
        
        // Send SSE notification for asset events
        // Note: user_id would need to be added as metadata when creating the asset
        // For now, we'll skip user-specific notifications for Mux events
        // if (event.data?.metadata?.user_id) {
        //   sseNotificationService.sendUserNotification(
        //     event.data.metadata.user_id,
        //     'video_asset_update',
        //     {
        //       type: event.type,
        //       status: event.type.includes('ready') ? 'ready' : 'processing',
        //       data: event.data,
        //       timestamp: new Date().toISOString(),
        //     }
        //   );
        // }
        break;

      case "video.asset.deleted":
      case "video.asset.errored":
        // TODO: Handle asset problems
        console.info(`Asset issue event: ${event.type}`, event.data);
        
        // Send SSE notification for asset issues
        // Note: user_id would need to be added as metadata when creating the asset
        // For now, we'll skip user-specific notifications for Mux events
        // if (event.data?.metadata?.user_id) {
        //   sseNotificationService.sendUserNotification(
        //     event.data.metadata.user_id,
        //     'video_asset_issue',
        //     {
        //       type: event.type,
        //       status: 'error',
        //       data: event.data,
        //       timestamp: new Date().toISOString(),
        //     },
        //     'high' // High priority for errors
        //   );
        // }
        break;

      // For any unhandled event types
      default:
        console.warn(`Unhandled webhook type: ${event.type}`, event.data);
        break;
    }

    return Response.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
