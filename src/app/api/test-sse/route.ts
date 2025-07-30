import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import {
  sendNotificationToUsers,
  broadcastNotification,
  sendVideoUploadProgress,
  sendCustomEvent,
} from "@/features/sse";
import { logger } from "@/utils/logging";

const contextLogger = logger.createContextLogger("SSE-Test-API");

/**
 * Test endpoint for manually triggering SSE events
 * This is for development and testing purposes only
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body: {
      type: string;
      message?: string;
      data?: Record<string, unknown>;
      targetUserId?: string;
    } = await request.json();
    const { type, message, data, targetUserId } = body;

    contextLogger.info("Test SSE event requested", {
      type,
      session: !!session,
    });

    switch (type) {
      case "notification":
        if (session?.user?.id) {
          await sendNotificationToUsers(
            targetUserId ?? session.user.id,
            message ?? "Test notification from SSE test endpoint",
            "info",
            { source: "test-api", timestamp: new Date().toISOString() },
          );
        } else {
          await broadcastNotification(
            message ?? "Test broadcast notification",
            "info",
            { source: "test-api", timestamp: new Date().toISOString() },
          );
        }
        break;

      case "video_upload":
        if (session?.user?.id) {
          await sendVideoUploadProgress(
            session.user.id,
            `test-upload-${Date.now()}`,
            Math.floor(Math.random() * 100),
            "uploading",
            { source: "test-api" },
          );
        }
        break;

      case "custom":
        await sendCustomEvent(
          (data?.eventType as string) ?? "test_event",
          data ?? {
            message: "Custom test event",
            timestamp: new Date().toISOString(),
          },
          session?.user?.id
            ? { userIds: [targetUserId ?? session.user.id] }
            : { broadcast: true },
        );
        break;

      case "broadcast":
        await broadcastNotification(
          message ?? "Test broadcast to all users",
          "success",
          { source: "test-api", timestamp: new Date().toISOString() },
        );
        break;

      default:
        return Response.json({ error: "Invalid event type" }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: "SSE event sent successfully",
      type,
      authenticated: !!session,
    });
  } catch (error) {
    contextLogger.error("Failed to send test SSE event", error);

    return Response.json(
      {
        error: "Failed to send SSE event",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
