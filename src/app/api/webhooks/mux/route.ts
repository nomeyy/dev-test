import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { muxWebhookService } from "@/features/mux";
import { integrations, notifications } from "@/features/sse";

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
        console.info(`Upload created: ${event.type}`, event.data);
        // Send SSE notification for upload started
        const uploadId = event.data.id;
        const userId =
          event.data.new_asset_settings?.passthrough || "demo-user-123"; // Extract userId from passthrough
        await integrations.video.uploadStarted(userId, uploadId);
        break;

      case "video.upload.asset_created":
        console.info(`Upload asset created: ${event.type}`, event.data);
        const assetId = event.data.id;
        const uploadUserId =
          event.data.new_asset_settings?.passthrough || "demo-user-123";
        await notifications.success(uploadUserId, "Video processing started", {
          assetId,
          status: "processing",
        });
        break;

      case "video.upload.cancelled":
        console.info(`Upload cancelled: ${event.type}`, event.data);
        const cancelledUserId =
          event.data.new_asset_settings?.passthrough || "demo-user-123";
        await notifications.warning(
          cancelledUserId,
          "Video upload was cancelled",
          {
            uploadId: event.data.id,
            status: "cancelled",
          },
        );
        break;

      case "video.upload.errored":
        console.info(`Upload errored: ${event.type}`, event.data);
        const errorUserId =
          event.data.new_asset_settings?.passthrough || "demo-user-123";
        await integrations.video.uploadFailed(
          errorUserId,
          event.data.id,
          "Upload failed",
        );
        break;

      // Asset-related events
      case "video.asset.created":
        console.info(`Asset created: ${event.type}`, event.data);
        const createdUserId = event.data.passthrough || "demo-user-123";
        await notifications.success(createdUserId, "Video asset created", {
          assetId: event.data.id,
          status: "created",
        });
        break;

      case "video.asset.updated":
        console.info(`Asset updated: ${event.type}`, event.data);
        const updatedUserId = event.data.passthrough || "demo-user-123";
        await notifications.info(updatedUserId, "Video asset updated", {
          assetId: event.data.id,
          status: "updated",
        });
        break;

      case "video.asset.ready":
        console.info(`Asset ready: ${event.type}`, event.data);
        const readyUserId = event.data.passthrough || "demo-user-123";
        await integrations.video.uploadCompleted(readyUserId, event.data.id);
        break;

      case "video.asset.deleted":
        console.info(`Asset deleted: ${event.type}`, event.data);
        const deletedUserId = event.data.passthrough || "demo-user-123";
        await notifications.info(deletedUserId, "Video asset deleted", {
          assetId: event.data.id,
          status: "deleted",
        });
        break;

      case "video.asset.errored":
        console.info(`Asset errored: ${event.type}`, event.data);
        const assetErrorUserId = event.data.passthrough || "demo-user-123";
        await notifications.error(assetErrorUserId, "Video processing failed", {
          assetId: event.data.id,
          status: "error",
          errors: event.data.errors,
        });
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
