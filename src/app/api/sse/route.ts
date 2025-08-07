// app/api/sse/route.ts
import type { NextRequest } from "next/server";
import sseManager from "@/lib/sse/manager";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? crypto.randomUUID();

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add client to manager
      sseManager.addClient(id, controller);

      // Send initial connection confirmation
      const initialMessage = `event: connected\ndata: ${JSON.stringify({
        id,
        timestamp: Date.now(),
        message: "Successfully connected to SSE stream",
      })}\n\n`;

      controller.enqueue(new TextEncoder().encode(initialMessage));
    },
    cancel() {
      // Client disconnected
      sseManager.removeClient(id);
    },
  });

  // Handle client disconnect
  request.signal.addEventListener("abort", () => {
    sseManager.removeClient(id);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
