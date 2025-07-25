import { type NextRequest } from "next/server";
import { broadcastNotification, notifyUsers } from "@/features/sse";
import { logger } from "@/utils/logging";

const log = logger.createContextLogger("SSE-Test-API");

/**
 * Test endpoint for triggering SSE events
 * POST /api/sse/test - Sends test events to connected clients
 */
interface TestEventBody {
  type?: string;
  message?: string;
  userId?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as TestEventBody;

    const { type = "test_notification", message, userId } = body;

    log.info("Test SSE event triggered", { type, message, userId });

    // Send different types of test events
    switch (type) {
      case "test_notification":
        if (userId) {
          await notifyUsers(
            "test_notification",
            {
              message: message ?? "Test notification sent to specific user",
              severity: "info",
            },
            [userId],
          );
        } else {
          await broadcastNotification("test_notification", {
            message: message ?? "Test notification broadcast to all users",
            severity: "info",
          });
        }
        break;

      case "system_alert":
        await broadcastNotification("system_alert", {
          message: message ?? "System alert test message",
          severity: "warning",
        });
        break;

      case "progress_update":
        await broadcastNotification("progress_update", {
          operationId: "test-operation-" + Date.now(),
          progress: Math.floor(Math.random() * 100),
          message: message ?? "Test progress update",
        });
        break;

      default:
        await broadcastNotification(type, {
          message: message ?? "Custom test event",
          timestamp: new Date().toISOString(),
        });
    }

    return Response.json({
      success: true,
      message: "Test event sent successfully",
      type,
    });
  } catch (error) {
    log.error("Error sending test SSE event", error);
    return Response.json(
      {
        error: "Failed to send test event",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
