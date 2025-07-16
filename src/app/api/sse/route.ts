import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { getSSEConnectionManager } from "@/features/sse";
import type { SSEClient } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSE-API");

/**
 * SSE endpoint for client connections
 * Handles Server-Sent Events streams for real-time notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Get session information
    const session = await auth();
    log.info("request headers", {
      cookie: request.headers.get("cookie"),
      authorization: request.headers.get("authorization"),
      userAgent: request.headers.get("user-agent"),
    });

    // Extract client information from query parameters
    const { searchParams } = new URL(request.url);
    const clientId =
      searchParams.get("clientId") ||
      `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = searchParams.get("sessionId") || undefined;
    const userId = searchParams.get("userId") || session?.user?.id; // Allow userId from query params as fallback

    log.info("SSE connection request", {
      clientId,
      userId,
      sessionId,
      sessionAvailable: !!session,
      cookies: request.headers.get("cookie"),
      userAgent: request.headers.get("user-agent"),
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const abortController = new AbortController();

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        const reader = readable.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        };
        pump().catch((error) => {
          log.error("Stream pump error", { error });
          controller.error(error);
        });

        // Create SSE client
        const client: SSEClient = {
          id: clientId,
          userId,
          sessionId,
          writer,
          controller: abortController,
          lastPing: Date.now(),
          connectedAt: Date.now(),
          metadata: {
            userAgent: request.headers.get("user-agent"),
            ip:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "unknown",
          },
        };

        // Connect to SSE manager
        const connectionManager = getSSEConnectionManager();
        connectionManager.connect(client).catch((error) => {
          log.error("Failed to connect SSE client", { clientId, error });
          controller.error(error);
        });

        // Handle connection close
        const handleClose = () => {
          log.info("SSE connection closed", { clientId });
          connectionManager.disconnect(clientId);
        };

        // Set up cleanup on stream close
        abortController.signal.addEventListener("abort", handleClose);

        // Handle client disconnect
        request.signal.addEventListener("abort", handleClose);
      },

      cancel() {
        log.info("SSE stream cancelled", { clientId });
      },
    });

    // Return SSE response
    return new Response(stream, {
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
    log.error("SSE endpoint error", { error });
    return handleError("SSE endpoint", error);
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
    },
  });
}
