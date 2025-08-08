import type { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSE-Route");

export async function GET(request: NextRequest) {
  try {
    const clientId =
      request.nextUrl.searchParams.get("clientId") ?? `client_${Date.now()}`;

    // Get userId from query parameter or use default
    const userId =
      request.nextUrl.searchParams.get("userId") ?? "test-user-123";

    log.info("SSE connection request", { userId, clientId });

    // Create SSE response headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    };

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Register client with SSE manager
        sseManager.registerClient(userId, clientId, controller);

        // Send initial connection event
        const connectionEvent = `event: connected\ndata: ${JSON.stringify({
          clientId,
          userId,
          timestamp: new Date().toISOString(),
        })}\n\n`;

        controller.enqueue(new TextEncoder().encode(connectionEvent));

        // Set up heartbeat interval
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeatEvent = `event: ping\ndata: ${JSON.stringify({
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(heartbeatEvent));
          } catch (error) {
            log.error("Failed to send heartbeat", error);
            clearInterval(heartbeatInterval);
            sseManager.removeClient(userId, clientId);
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          log.info("Client disconnected", { userId, clientId });
          clearInterval(heartbeatInterval);
          sseManager.removeClient(userId, clientId);
          controller.close();
        });

        // Handle stream errors
        controller.error = (error) => {
          log.error("SSE stream error", error);
          clearInterval(heartbeatInterval);
          sseManager.removeClient(userId, clientId);
        };
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    return handleError("SSE connection", error);
  }
}

// Handle preflight requests for CORS
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
