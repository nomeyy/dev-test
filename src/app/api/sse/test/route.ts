import { NextRequest, NextResponse } from "next/server";
import {
  sendNotification,
  sendDataUpdate,
  sendCustomEvent,
  broadcastEvent,
  broadcastNotification,
  broadcastDataUpdate,
} from "@/features/sse";
import { logger } from "@/utils/logging";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, connectionId, ...data } = body;

    logger.info(
      "SSE test event requested",
      "test",
      JSON.stringify({ type, connectionId }),
    );

    let result = 0;

    switch (type) {
      case "test_notification":
        result = await sendNotification(
          data.message || "Test notification from server!",
          {
            connectionId,
            title: "Test Notification",
            type: "info",
          },
        );
        break;

      case "data_update":
        result = await sendDataUpdate(
          data.dataType || "test_data",
          data.data || { message: "Test data update" },
          { connectionId },
        );
        break;

      case "broadcast_notification":
        result = await broadcastNotification(
          data.message || "🔊 Broadcast notification to ALL tabs and users!",
          {
            title: "Broadcast Notification",
            type: "info",
          },
        );
        break;

      case "broadcast_data_update":
        result = await broadcastDataUpdate(
          data.dataType || "broadcast_data",
          data.data || {
            message: "🌍 Broadcast data update",
            timestamp: Date.now(),
            allUsers: Math.floor(Math.random() * 10000),
            activeConnections: Math.floor(Math.random() * 500),
          },
        );
        break;

      case "broadcast_system":
        result = await broadcastEvent("system_announcement", {
          message: data.message || "📢 System-wide announcement!",
          priority: "high",
          type: "maintenance",
          timestamp: Date.now(),
        });
        break;

      case "custom_event":
        result = await sendCustomEvent(
          data.eventType || "custom_test",
          data.payload || { message: "Custom test event" },
          { connectionId },
        );
        break;

      default:
        return NextResponse.json(
          { error: "Unknown event type" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      eventsSent: result,
      message: `Sent ${type} to ${result} connection(s)`,
    });
  } catch (error) {
    logger.error("SSE test endpoint error", "error", String(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
