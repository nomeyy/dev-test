import { NextRequest } from "next/server";
import { getSSEManager } from "@/features/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // For demo purposes, we'll skip authentication
  const userId = undefined;

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId") || undefined;

  // Create a new ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const sseManager = getSSEManager();

      // Set up SSE headers
      const headers = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      });

      try {
        // Register the client with SSE manager
        const clientId = sseManager.addClient(controller, userId, sessionId, {
          userAgent: request.headers.get("user-agent") || undefined,
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            undefined,
        });

        // Log connection
        console.info(
          `[SSE] Client connected: ${clientId} (user: ${userId || "anonymous"})`,
        );

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.info(`[SSE] Client disconnected: ${clientId}`);
          sseManager.removeClient(clientId);
        });
      } catch (error) {
        console.error("[SSE] Error setting up client:", error);
        controller.error(error);
      }
    },

    cancel() {
      // This is called when the client disconnects
      console.info("[SSE] Stream cancelled by client");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
