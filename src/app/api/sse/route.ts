import type { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");

  const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const initialMessage = `id: ${clientId}\nevent: connected\ndata: ${JSON.stringify({ clientId, message: "Connected to SSE" })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      sseManager.addClient(clientId, controller, {
        userId: userId ?? undefined,
        sessionId: sessionId ?? undefined,
      });

      setTimeout(() => {
        try {
          const testMessage = `id: ${Date.now()}\nevent: test\ndata: ${JSON.stringify({ message: "Test message from server", clientId })}\n\n`;
          controller.enqueue(encoder.encode(testMessage));
        } catch (error) {
          console.error(
            `Failed to send test message to client: ${clientId}`,
            error,
          );
          sseManager.removeClient(clientId);
        }
      }, 1000);

      const keepAliveInterval = setInterval(() => {
        try {
          const keepAliveMessage = `: keep-alive\n\n`;
          controller.enqueue(encoder.encode(keepAliveMessage));
        } catch (error) {
          console.error(
            `Failed to send keep-alive to client: ${clientId}`,
            error,
          );
          clearInterval(keepAliveInterval);
          sseManager.removeClient(clientId);
        }
      }, 30000);

      sseManager.addKeepAliveInterval(clientId, keepAliveInterval);
    },
    cancel() {
      sseManager.removeClient(clientId);
    },
  });

  request.signal.addEventListener("abort", () => {
    sseManager.removeClient(clientId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no",
    },
  });
}
