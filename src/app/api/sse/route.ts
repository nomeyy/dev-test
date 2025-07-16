import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { sseService } from "@/features/sse";
import { SSEEventType } from "@/features/sse/types";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSEEndpoint");

/**
 * Server-Sent Events (SSE) endpoint
 * Handles client connections and maintains real-time event streams
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const url = new URL(request.url);

    // Extract connection parameters
    const userId = url.searchParams.get("userId");
    const sessionId = url.searchParams.get("sessionId");

    log.info("SSE connection request", {
      userId,
      sessionId,
      userAgent: headersList.get("user-agent"),
    });

    // Create abort controller for connection management
    const controller = new AbortController();

    // Register the connection
    const connectionId = sseService.registerConnection({
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      request,
      controller,
    });

    // Send initial connection event
    const connectionEvent = {
      type: SSEEventType.MESSAGE,
      data: {
        message: "Connected to SSE stream",
        connectionId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      id: connectionId,
    };

    // Create the SSE response stream with event forwarding
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const message = `event: ${connectionEvent.type}\ndata: ${JSON.stringify(connectionEvent.data)}\nid: ${connectionEvent.id}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));

        // Set up connection cleanup on abort
        request.signal.addEventListener("abort", () => {
          sseService.removeConnection(connectionId);
          controller.close();
        });

        // Keep the connection alive with periodic messages
        const keepAliveInterval = setInterval(() => {
          if (request.signal.aborted) {
            clearInterval(keepAliveInterval);
            return;
          }

          const keepAliveMessage = `event: ${SSEEventType.HEARTBEAT}\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(keepAliveMessage));
        }, 30000); // Send keep-alive every 30 seconds

        // Clean up interval when connection is closed
        request.signal.addEventListener("abort", () => {
          clearInterval(keepAliveInterval);
        });

        // Set up event forwarding for this connection
        const sendEventToClient = (event: any) => {
          if (request.signal.aborted) return;

          try {
            const eventMessage = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${event.id || event.timestamp}\n\n`;
            log.debug("Sending event to client", {
              connectionId,
              eventType: event.type,
              eventData: event.data,
            });
            controller.enqueue(new TextEncoder().encode(eventMessage));
          } catch (error) {
            log.error("Failed to send event to client", error);
          }
        };

        // Store the send function in the connection for later use
        const connection = sseService.getConnection(connectionId);
        if (connection) {
          connection.sendEvent = sendEventToClient;
          log.info("SSE connection established with event forwarding", {
            connectionId,
            userId,
            sessionId,
          });
        } else {
          log.error("Failed to get connection for event forwarding", {
            connectionId,
            userId,
            sessionId,
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    log.error("SSE connection failed", error);
    return Response.json(
      { error: "Failed to establish SSE connection" },
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
