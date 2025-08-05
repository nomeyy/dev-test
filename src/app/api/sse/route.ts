/**
 * Server-Sent Events API Route
 * ----------------------------
 * Handles SSE client connections, authentication, and stream management
 */

import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { getSSEManager } from "@/features/sse";

/**
 * GET handler for SSE connections
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Get authentication session
    const session = await auth();
    const userId = session?.user?.id;

    // Extract session ID from headers or generate one
    const sessionId =
      request.headers.get("x-session-id") ||
      request.headers.get("cookie")?.match(/sessionId=([^;]+)/)?.[1];

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Initialize SSE manager and create connection
          const sseManager = getSSEManager();
          const connectionId = sseManager.createConnection(
            controller,
            userId,
            sessionId,
          );

          // Store connection ID in request context for cleanup
          (request as any).sseConnectionId = connectionId;

          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            console.log(`Client disconnected: ${connectionId}`);
            sseManager.removeConnection(connectionId);
          });
        } catch (error) {
          console.error("Error setting up SSE connection:", error);
          controller.error(error);
        }
      },

      cancel() {
        // Cleanup on stream cancellation
        const connectionId = (request as any).sseConnectionId;
        if (connectionId) {
          const sseManager = getSSEManager();
          sseManager.removeConnection(connectionId);
        }
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Cache-Control, Content-Type, X-Session-Id",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    console.error("SSE endpoint error:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Cache-Control, Content-Type, X-Session-Id",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
