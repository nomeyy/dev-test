import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { muxWebhookService } from "@/features/mux";

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
        console.info(`Upload event: ${event.type}`, event.data);
        // TODO: Extract user ID from upload metadata and send progress update
        // await sendVideoUploadProgress(userId, event.data.id, 0, "uploading");
        break;

      case "video.upload.asset_created":
        console.info(`Upload event: ${event.type}`, event.data);
        // TODO: Send upload progress update
        // await sendVideoUploadProgress(userId, event.data.upload_id, 50, "processing");
        break;

      case "video.upload.cancelled":
        console.info(`Upload event: ${event.type}`, event.data);
        // TODO: Notify user of cancellation
        // await sendNotificationToUsers(userId, "Video upload was cancelled", "warning");
        break;

      case "video.upload.errored":
        console.info(`Upload event: ${event.type}`, event.data);
        // TODO: Notify user of upload error
        // await sendNotificationToUsers(userId, `Video upload failed: ${event.data.error?.message || 'Unknown error'}`, "error");
        break;

      // Asset-related events
      case "video.asset.created":
        console.info(`Asset event: ${event.type}`, event.data);
        // TODO: Send asset creation notification
        // await sendVideoUploadProgress(userId, uploadId, 75, "processing");
        break;

      case "video.asset.updated":
        console.info(`Asset event: ${event.type}`, event.data);
        break;

      case "video.asset.ready":
        console.info(`Asset ready event: ${event.type}`, event.data);
        // TODO: Extract user ID and send video ready notification
        // const assetData = event.data;
        // await sendVideoReady(userId, assetData.id, {
        //   title: assetData.master?.name,
        //   duration: assetData.duration,
        //   playbackUrl: assetData.playback_ids?.[0]?.id
        //     ? `https://stream.mux.com/${assetData.playback_ids[0].id}.m3u8`
        //     : undefined,
        //   thumbnailUrl: assetData.playback_ids?.[0]?.id
        //     ? `https://image.mux.com/${assetData.playback_ids[0].id}/thumbnail.jpg`
        //     : undefined,
        // });
        break;

      case "video.asset.deleted":
        console.info(`Asset issue event: ${event.type}`, event.data);
        // TODO: Notify user of asset deletion
        // await sendNotificationToUsers(userId, "Video has been deleted", "info");
        break;

      case "video.asset.errored":
        console.info(`Asset issue event: ${event.type}`, event.data);
        // TODO: Notify user of asset processing error
        // await sendNotificationToUsers(userId, `Video processing failed: ${event.data.error?.message || 'Unknown error'}`, "error");
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
