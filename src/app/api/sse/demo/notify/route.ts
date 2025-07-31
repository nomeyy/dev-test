import type { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSEDemoNotify");

/**
 * Demo endpoint for broadcasting notifications to all connected clients
 * POST /api/sse/demo/notify
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      type?: string;
      timestamp?: string;
      [key: string]: unknown; // Allow any additional properties
    };

    // Extract the event type from the request body, default to "notification"
    const eventType = body.type ?? "notification";

    log.info("Broadcasting demo event", {
      eventType,
      message: body.message,
    });

    // Get connection stats for debugging
    const stats = sseManager.getStats();
    log.info("Current SSE stats", stats);

    // Broadcast to all connected clients with the specific event type
    const sentCount = sseManager.broadcast({
      event: eventType,
      data: body,
    });

    return Response.json({
      success: sentCount > 0,
      sentCount,
      connectedClients: stats.totalConnections,
      message: `Event broadcasted to ${sentCount} of ${stats.totalConnections} connected clients`,
    });
  } catch (error) {
    handleError("sending demo notification", error);

    return Response.json(
      {
        error: "Failed to send notification",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
