import type { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";
import { type SSEEvent } from "@/features/sse/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");

  // Set SSE headers
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  };

  // Create a unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create the stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      console.log(`SSE: Creating client ${clientId}`);

      // Create the SSE client
      const client = {
        id: clientId,
        userId: userId ?? null,
        sessionId: sessionId ?? null,
        send: (event: SSEEvent) => {
          console.log(`SSE: Sending event to client ${clientId}:`, event);
          const data = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(data));
        },
        close: () => {
          console.log(`SSE: Closing client ${clientId}`);
          controller.close();
        },
      };

      // Add client to manager
      sseManager.addClient(client);

      // Send initial connection event
      const connectEvent = {
        event: "connect",
        data: { clientId, userId, sessionId },
      };

      const connectData = `event: connect\ndata: ${JSON.stringify(connectEvent.data)}\n\n`;
      controller.enqueue(encoder.encode(connectData));
      console.log(`SSE: Sent connect event to client ${clientId}`);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(`SSE: Client ${clientId} disconnected`);
        sseManager.removeClient(clientId);
      });
    },
    cancel() {
      // Client disconnected
      console.log(`SSE: Client ${clientId} connection cancelled`);
      sseManager.removeClient(clientId);
    },
  });

  return new Response(stream, { headers });
}
