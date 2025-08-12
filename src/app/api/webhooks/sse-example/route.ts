import { NextRequest } from "next/server";
import { notifyUser, notifyTopic, broadcast } from "@/server/sse";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    log.info("SSE Example webhook received", { 
      type: payload.type, 
      userId: payload.userId 
    });

    // Example: Process different webhook types
    switch (payload.type) {
      case "user_notification":
        // Send notification to specific user
        if (payload.userId) {
          await notifyUser(payload.userId, "webhook_notification", {
            type: payload.type,
            message: payload.message,
            timestamp: Date.now(),
            source: "webhook"
          });
        }
        break;

      case "system_alert":
        // Broadcast system alert to all users
        await broadcast("system_alert", {
          level: payload.level || "info",
          message: payload.message,
          timestamp: Date.now(),
          source: "webhook"
        });
        break;

      case "topic_update":
        // Send update to topic subscribers
        if (payload.topic) {
          await notifyTopic(payload.topic, "topic_update", {
            data: payload.data,
            timestamp: Date.now(),
            source: "webhook"
          });
        }
        break;

      case "live_data":
        // Send live data updates
        await notifyTopic("live-data", "data_update", {
          data: payload.data,
          timestamp: Date.now(),
          source: "webhook"
        });
        break;

      default:
        log.warn("Unknown webhook type", { type: payload.type });
    }

    return Response.json({ 
      success: true, 
      message: "Webhook processed and SSE notifications sent" 
    });

  } catch (error) {
    log.error("Error processing SSE example webhook", { error });
    return Response.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
