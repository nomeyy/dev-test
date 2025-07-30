import { NextRequest, NextResponse } from "next/server";
import { getSSEManager } from "@/features/sse";
import type { SSEClient } from "@/features/sse";

export async function GET(request: NextRequest) {
  try {
    // Generate unique client ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create SSE response headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    };

    // Create the response stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const connectEvent = {
          event: "connect",
          data: {
            clientId,
            timestamp: Date.now(),
            message: "Connected to SSE server",
          },
        };

        const sseData = formatSSEEvent(connectEvent);
        controller.enqueue(new TextEncoder().encode(sseData));

        // Create client object
        const client: SSEClient = {
          id: clientId,
          userId: undefined, // Will be set when auth is implemented
          sessionId: undefined,
          response: new Response(),
          createdAt: new Date(),
          lastPing: new Date(),
          isConnected: true,
          lastActivity: new Date(),
          errorCount: 0,
          controller: controller,
        };

        // Add client to manager
        const sseManager = getSSEManager();
        sseManager.addClient(client);

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`SSE: Client ${clientId} disconnected`);
          sseManager.removeClient(clientId);
        });

        // Handle stream close
        request.signal.addEventListener("close", () => {
          console.log(`SSE: Stream closed for client ${clientId}`);
          sseManager.removeClient(clientId);
        });
      },
    });

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error("SSE: Error establishing connection:", error);
    return NextResponse.json(
      { error: "Failed to establish SSE connection" },
      { status: 500 },
    );
  }
}

function formatSSEEvent(event: {
  event: string;
  data: any;
  id?: string;
  retry?: number;
}): string {
  let sseData = "";

  if (event.id) {
    sseData += `id: ${event.id}\n`;
  }

  if (event.retry) {
    sseData += `retry: ${event.retry}\n`;
  }

  sseData += `event: ${event.event}\n`;
  sseData += `data: ${JSON.stringify(event.data)}\n\n`;

  return sseData;
}
