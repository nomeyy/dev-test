import { NextRequest } from "next/server";
import { getSSEManager } from "@/features/sse";
import { logger } from "@/utils/logging";
import { createTRPCContext } from "@/lib/trpc";
import { generateId } from "@/features/sse";

export async function GET(request: NextRequest) {
  try {
    // Create tRPC context to access session data
    const ctx = await createTRPCContext({ headers: request.headers });

    // Extract connection parameters
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId") || generateId();
    const userId = ctx.session?.user?.id;
    const sessionId = ctx.session
      ? "session_" + ctx.session.user.id + "_" + Date.now()
      : undefined;

    logger.info(
      "SSE connection request",
      connectionId,
      userId,
      sessionId ? "present" : "none",
    );

    // Set up SSE headers
    const responseHeaders = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    let isConnectionActive = true;

    const stream = new ReadableStream({
      start(controller) {
        // Get SSE manager instance
        const sseManager = getSSEManager();

        // Create a writer that writes to the response stream
        const writer = new WritableStream({
          write(chunk) {
            if (isConnectionActive) {
              controller.enqueue(chunk);
            }
          },
          close() {
            if (isConnectionActive) {
              controller.close();
            }
          },
          abort(reason) {
            logger.warn("SSE stream aborted", connectionId, reason);
            if (isConnectionActive) {
              controller.error(reason);
            }
          },
        }).getWriter();

        // Add connection to SSE manager
        const success = sseManager.addConnection(
          connectionId,
          writer,
          userId,
          sessionId,
        );

        if (!success) {
          logger.error("Failed to add SSE connection", connectionId);
          controller.error(new Error("Failed to establish connection"));
          return;
        }

        // Handle connection cleanup on client disconnect
        const cleanup = () => {
          if (isConnectionActive) {
            isConnectionActive = false;
            sseManager.removeConnection(connectionId);
            // Don't manually close the writer - let the stream handle it
            // The controller.close() or controller.error() will handle cleanup
          }
        };

        // Set up cleanup on various events
        request.signal.addEventListener("abort", cleanup);

        // Also cleanup after a reasonable timeout if no activity
        const timeoutId = setTimeout(
          () => {
            logger.info("SSE connection timeout", connectionId);
            cleanup();
          },
          5 * 60 * 1000,
        ); // 5 minutes timeout

        // Clear timeout if connection is properly closed
        const originalClose = controller.close.bind(controller);
        controller.close = () => {
          clearTimeout(timeoutId);
          cleanup();
          originalClose();
        };
      },

      cancel(reason) {
        logger.info("SSE stream cancelled", connectionId, reason);
        isConnectionActive = false;
        const sseManager = getSSEManager();
        sseManager.removeConnection(connectionId);
      },
    });

    return new Response(stream, {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    logger.error("SSE endpoint error", String(error));
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
    },
  });
}
