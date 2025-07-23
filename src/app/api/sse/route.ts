import type { NextRequest } from "next/server";
import { SSEManager, type SSEClient } from "@/features/sse";
import { logger } from "@/utils/logging";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? `client-${Date.now()}`;
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");

  logger.info("SSE", `New connection request: ${clientId}`, {
    userId,
    sessionId,
  });

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Create SSE client with proper interface
      const client: SSEClient = {
        id: clientId,
        userId: userId ?? undefined,
        sessionId: sessionId ?? undefined,
        controller: controller as ReadableStreamDefaultController<Uint8Array>,
        lastPing: new Date(),
        metadata: {},
      };

      // Add client to manager
      void SSEManager.getInstance().addClient(client);

      // Send initial connection confirmation
      const welcomeMessage = `event: connected\ndata: ${JSON.stringify({
        clientId,
        timestamp: new Date().toISOString(),
      })}\n\n`;

      try {
        controller.enqueue(new TextEncoder().encode(welcomeMessage));
      } catch (error) {
        logger.error("SSE", `Error sending welcome message: ${String(error)}`);
      }

      logger.info("SSE", `Client connected: ${clientId}`);
    },

    cancel() {
      // Clean up when client disconnects
      void SSEManager.getInstance().removeClient(clientId);
      logger.info("SSE", `Client disconnected: ${clientId}`);
    },
  });

  // Return SSE response with proper headers
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
}
