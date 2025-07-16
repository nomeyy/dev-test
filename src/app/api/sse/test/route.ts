import { type NextRequest } from "next/server";
import { sseService } from "@/features/sse";
import { SSEEventType } from "@/features/sse/types";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSETestEndpoint");

/**
 * SSE Test endpoint for sending test events
 * Allows the demo page to send test events to the SSE stream
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    log.info("Test event request", { type, data });

    // Validate event type
    const validTypes = [
      SSEEventType.NOTIFICATION,
      SSEEventType.UPLOAD_PROGRESS,
      SSEEventType.ASSET_READY,
      SSEEventType.USER_UPDATE,
    ];

    if (!validTypes.includes(type)) {
      console.log("Invalid event type. Must be one of:", validTypes.join(", "));
      return Response.json(
        {
          error: `Invalid event type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Create the event
    const event = {
      type,
      data,
      timestamp: Date.now(),
      id: `test-${Date.now()}`,
    };

    // Send the event
    await sseService.sendEvent(event, {
      userId: data.userId,
      broadcast: false, // Only send to the specific user
    });

    // Also try broadcasting to all connections for testing
    await sseService.sendEvent(event, {
      broadcast: true, // Send to all connections
    });

    log.info("Test event sent successfully", {
      type,
      userId: data.userId,
      eventData: data,
      stats: sseService.getStats(),
    });

    return Response.json({
      success: true,
      message: "Test event sent successfully",
      event,
    });
  } catch (error) {
    handleError("Sending test SSE event", error);
    return Response.json(
      { error: "Failed to send test event" },
      { status: 500 },
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
