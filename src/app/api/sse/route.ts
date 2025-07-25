import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/features/auth";
import { sseManager, type SSEConnection } from "@/features/sse";
import { logger } from "@/utils/logging";

/**
 * SSE endpoint for establishing Server-Sent Event connections
 * Handles client connections and maintains real-time communication
 *
 * GET /api/sse - Establishes SSE connection for the client
 */
export async function GET(request: NextRequest): Promise<Response> {
  const log = logger.createContextLogger("SSE-API");

  try {
    // Get session information
    const session = await getSession();
    const headersList = await headers();

    // Extract request context
    const userAgent = headersList.get("user-agent") ?? "unknown";
    const clientIp =
      headersList.get("x-forwarded-for") ??
      headersList.get("x-real-ip") ??
      "unknown";

    // Generate unique connection ID
    const connectionId = crypto.randomUUID();

    // Extract session ID (you might need to adjust this based on your session implementation)
    const sessionId =
      request.nextUrl.searchParams.get("sessionId") ??
      headersList.get("x-session-id") ??
      crypto.randomUUID();

    log.info("New SSE connection request", {
      connectionId,
      userId: session?.user?.id,
      sessionId,
      userAgent,
      clientIp,
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const now = new Date();

        // Create connection object
        const connection: SSEConnection = {
          id: connectionId,
          userId: session?.user?.id,
          sessionId,
          connectedAt: now,
          lastActivity: now,
          headers: {
            userAgent,
            clientIp,
            origin: headersList.get("origin") ?? "unknown",
          },
          controller: streamController,
          status: "connected",
        };

        // Add connection to manager
        try {
          sseManager.addConnection(connection);

          // Send initial connection success event immediately
          const welcomeEvent = {
            event: "connected",
            data: {
              connectionId,
              timestamp: now.toISOString(),
              message: "Successfully connected to SSE stream",
            },
          };

          // Format and send welcome event
          const eventData = formatSSEEvent(welcomeEvent);
          const encoder = new TextEncoder();
          streamController.enqueue(encoder.encode(eventData));

          // Send a keep-alive comment to establish the connection
          streamController.enqueue(encoder.encode(": keep-alive\n\n"));

          log.info("SSE connection established", {
            connectionId,
            userId: session?.user?.id,
          });
        } catch (error) {
          log.error("Failed to establish SSE connection", error, {
            connectionId,
          });
          streamController.error(error);
        }
      },

      cancel() {
        // Handle connection close/cleanup
        log.info("SSE connection cancelled", {
          connectionId,
          userId: session?.user?.id,
        });
        sseManager.removeConnection(connectionId);
      },
    });

    // Handle client disconnect (when browser/tab closes)
    request.signal.addEventListener("abort", () => {
      log.info("SSE connection aborted", {
        connectionId,
        userId: session?.user?.id,
      });
      sseManager.removeConnection(connectionId);
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "Access-Control-Allow-Credentials": "true",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    log.error("Error handling SSE connection", error);
    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Format an event for SSE transmission
 */
function formatSSEEvent(event: {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
}): string {
  let formatted = "";

  if (event.id) {
    formatted += `id: ${event.id}\n`;
  }

  formatted += `event: ${event.event}\n`;
  formatted += `data: ${JSON.stringify(event.data)}\n`;

  if (event.retry) {
    formatted += `retry: ${event.retry}\n`;
  }

  formatted += "\n";
  return formatted;
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Cache-Control, X-Session-ID",
      "Access-Control-Max-Age": "86400",
    },
  });
}
