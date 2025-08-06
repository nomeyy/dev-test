import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { sseState } from "@/features/sse/server";
import { logger } from "@/features/shared/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clientId = uuidv4();

  try {
    const stream = new ReadableStream({
      start(controller) {
        // Add client to state manager
        sseState.addClient(clientId, controller);

        // Send initial connection event
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`,
          ),
        );

        // Set up heartbeat
        const heartbeat = setInterval(() => {
          try {
            sseState.sendToClient(clientId, "ping", { timestamp: Date.now() });
          } catch (error) {
            clearInterval(heartbeat);
            sseState.removeClient(clientId);
            controller.close();
          }
        }, 5000);

        // Handle client disconnect
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          sseState.removeClient(clientId);
          controller.close();
        });
      },
      cancel() {
        sseState.removeClient(clientId);
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
  } catch (error) {
    logger.error("Error establishing SSE connection", { error, clientId });
    return new Response("Internal Server Error", { status: 500 });
  }
}
