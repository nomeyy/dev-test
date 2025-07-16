import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { muxWebhookService } from "@/features/mux";
import { sendUploadProgress, sendAssetReady } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("MuxWebhookHandler");

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

    log.info("Processing Mux webhook", { type: event.type, data: event.data });

    // Extract userId from passthrough data if available
    const passthrough = (event.data as any)?.passthrough
      ? JSON.parse((event.data as any).passthrough)
      : {};
    const userId = passthrough.userId;
    const uploadId = (event.data as any)?.id;

    switch (event.type) {
      // Upload-related events
      case "video.upload.created":
        // Send initial upload progress
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 0, "uploading");
        }
        log.info(`Upload created: ${event.type}`, event.data);
        break;

      case "video.upload.asset_created":
        // Send progress update when asset is created
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 50, "processing");
        }
        log.info(`Upload asset created: ${event.type}`, event.data);
        break;

      case "video.upload.cancelled":
        // Send cancellation notification
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 0, "failed");
        }
        log.info(`Upload cancelled: ${event.type}`, event.data);
        break;

      case "video.upload.errored":
        // Send error notification
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 0, "failed");
        }
        log.error(`Upload error: ${event.type}`, event.data);
        break;

      // Asset-related events
      case "video.asset.created":
        // Send progress update when asset is created
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 75, "processing");
        }
        log.info(`Asset created: ${event.type}`, event.data);
        break;

      case "video.asset.updated":
        // Send progress update
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 90, "processing");
        }
        log.info(`Asset updated: ${event.type}`, event.data);
        break;

      case "video.asset.ready":
        // Send completion notification and asset ready event
        if (userId && uploadId) {
          // Send final progress update
          await sendUploadProgress(userId, uploadId, 100, "completed");

          // Send asset ready notification
          if ((event.data as any)?.playback_ids?.[0]?.id) {
            const playbackId = (event.data as any).playback_ids[0].id;
            const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;

            await sendAssetReady(
              userId,
              (event.data as any).id, // asset ID
              playbackUrl,
              {
                duration: (event.data as any).duration,
                aspectRatio: (event.data as any).aspect_ratio,
                resolution: `${(event.data as any).width}x${(event.data as any).height}`,
              },
            );
          }
        }
        log.info(`Asset ready: ${event.type}`, event.data);
        break;

      case "video.asset.deleted":
        // Handle asset deletion
        log.info(`Asset deleted: ${event.type}`, event.data);
        break;

      case "video.asset.errored":
        // Send error notification
        if (userId && uploadId) {
          await sendUploadProgress(userId, uploadId, 0, "failed");
        }
        log.error(`Asset error: ${event.type}`, event.data);
        break;

      // For any unhandled event types
      default:
        log.warn(`Unhandled webhook type: ${event.type}`, event.data);
        break;
    }

    return Response.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    return handleError("Processing Mux webhook", error);
  }
}
