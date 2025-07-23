import { type NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { sseService } from "../../../features/sse/services/sse-service";
import type { SSEClientConnection } from "../../../features/sse/types";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSERoute");

/**
 * SSE endpoint that accepts client connections and maintains open streams
 * Supports optional userId and sessionId query parameters for connection tracking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const connectionId = nanoid();

    log.info("SSE connection request", {
      connectionId,
      userId,
      sessionId,
      userAgent: request.headers.get("user-agent"),
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Create connection object
        const connection: SSEClientConnection = {
          id: connectionId,
          userId,
          sessionId,
          connectedAt: new Date(),
          lastPing: new Date(),
          controller,
        };

        // Add connection to service
        sseService.addConnection(connection);

        // Send initial connection event
        const encoder = new TextEncoder();
        const initialEvent = `id: ${nanoid()}\nevent: connected\ndata: ${JSON.stringify(
          {
            connectionId,
            timestamp: Date.now(),
            message: "SSE connection established",
          },
        )}\n\n`;

        controller.enqueue(encoder.encode(initialEvent));

        log.info("SSE connection established", {
          connectionId,
          userId,
          activeConnections: sseService.getActiveConnectionCount(),
        });
      },

      cancel() {
        // Clean up connection when client disconnects
        sseService.removeConnection(connectionId);
        log.info("SSE connection cancelled", {
          connectionId,
          userId,
          activeConnections: sseService.getActiveConnectionCount(),
        });
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    log.error("Failed to establish SSE connection", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
