import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ExampleIntegrationService } from "@/services/example-integration";
import { logger } from "@/utils/logging";

/**
 * API endpoint for testing SSE integration examples.
 * This demonstrates how backend services can integrate with the SSE system.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: string;
      userId?: string;
      jobId?: string;
      message?: string;
      type?: string;
      priority?: string;
      affectedUsers?: string[];
    };

    const { action, userId, jobId, message, type, priority, affectedUsers } =
      body;
    const integrationService = new ExampleIntegrationService();

    switch (action) {
      case "start_job":
        if (!userId || !jobId) {
          return NextResponse.json(
            { error: "Missing required fields: userId, jobId" },
            { status: 400 },
          );
        }
        // Start job processing in background (don't await)
        void integrationService.processJob(jobId, userId);
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} started for user ${userId}`,
        });

      case "send_notification":
        if (!userId || !message) {
          return NextResponse.json(
            { error: "Missing required fields: userId, message" },
            { status: 400 },
          );
        }
        await integrationService.sendNotification(
          userId,
          message,
          type as "info" | "success" | "warning" | "error",
        );
        return NextResponse.json({
          success: true,
          message: `Notification sent to user ${userId}`,
        });

      case "broadcast_announcement":
        if (!message) {
          return NextResponse.json(
            { error: "Missing required field: message" },
            { status: 400 },
          );
        }
        await integrationService.broadcastAnnouncement(
          message,
          priority as "low" | "medium" | "high",
        );
        return NextResponse.json({
          success: true,
          message: "Announcement broadcasted",
        });

      case "handle_webhook":
        if (!type || !affectedUsers) {
          return NextResponse.json(
            { error: "Missing required fields: type, affectedUsers" },
            { status: 400 },
          );
        }
        await integrationService.handleWebhook(type, affectedUsers);
        return NextResponse.json({
          success: true,
          message: `Webhook ${type} processed for ${affectedUsers.length} users`,
        });

      case "send_data_update":
        if (!userId || !type) {
          return NextResponse.json(
            { error: "Missing required fields: userId, type" },
            { status: 400 },
          );
        }
        await integrationService.sendDataUpdate(userId, type, {
          sampleData: "This is sample updated data",
          updatedAt: new Date().toISOString(),
        });
        return NextResponse.json({
          success: true,
          message: `Data update sent to user ${userId}`,
        });

      case "get_stats":
        const stats = await integrationService.getServiceStats();
        return NextResponse.json(stats);

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Available actions: start_job, send_notification, broadcast_announcement, handle_webhook, send_data_update, get_stats",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error(
      "INTEGRATION_API",
      "Error processing integration request:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
