import { NextRequest, NextResponse } from "next/server";
import { SSENotifications, getSSEManager } from "@/features/sse";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      type = "test",
      message = "Test message",
      targets,
      broadcast = false,
    } = body;

    let sent = 0;

    // Different event types for testing
    switch (type) {
      case "test":
        sent = SSENotifications.custom(
          "test",
          {
            message,
            timestamp: new Date().toISOString(),
            sender: "system",
          },
          targets,
        );
        break;

      case "system":
        sent = SSENotifications.systemUpdate(message, targets);
        break;

      case "user":
        if (targets && targets.length > 0) {
          sent = SSENotifications.userMessage(targets[0], message);
        }
        break;

      case "broadcast":
        sent = SSENotifications.custom("broadcast", {
          message,
          timestamp: new Date().toISOString(),
        });
        break;

      case "data":
        sent = SSENotifications.dataUpdated(
          "test",
          "123",
          {
            field: "value",
            updatedAt: new Date().toISOString(),
          },
          targets,
        );
        break;

      default:
        sent = SSENotifications.custom(type, { message }, targets);
    }

    // Get current stats
    const manager = getSSEManager();
    const stats = manager.getStats();

    return NextResponse.json({
      success: true,
      sent,
      stats,
      message: `Event sent to ${sent} client(s)`,
    });
  } catch (error) {
    console.error("[SSE Trigger] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve current SSE stats
export async function GET() {
  try {
    const manager = getSSEManager();
    const stats = manager.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[SSE Stats] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
