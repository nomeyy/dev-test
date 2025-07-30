import { NextRequest } from "next/server";
import { getSSEManager } from "@/features/sse";
import type { SSEConnectionOptions } from "@/features/sse/types";

/**
 * SSE endpoint for establishing server-sent events connections
 * Handles client connections, authentication, and stream management
 */
export async function GET(request: NextRequest) {
  try {
    // Parse connection options from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const clientId = searchParams.get("clientId") || crypto.randomUUID();

    // Create connection options
    const connectionOptions: SSEConnectionOptions = {
      userId,
      sessionId,
      clientId,
    };

    // Create an abort controller for this connection
    const abortController = new AbortController();

    // Create a new readable stream for the SSE connection
    const stream = new ReadableStream({
      start(controller) {
        console.log(`SSE: Stream started for client ${clientId}`);

        // Create the SSE client object
        const sseClient = {
          id: clientId,
          userId,
          sessionId,
          controller,
          abortController,
          lastPing: Date.now(),
          isAlive: true,
        };

        // Add the client to the SSE manager
        const sseManager = getSSEManager();
        sseManager.addClient(sseClient);

        // Send initial connection message
        const initialMessage = `id: ${Date.now()}\nevent: connected\ndata: {"clientId": "${clientId}", "status": "connected"}\n\n`;
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(initialMessage));

        // Send event history to new client
        const eventHistory = sseManager.getEventHistory();
        if (eventHistory.length > 0) {
          console.log(
            `SSE: Sending ${eventHistory.length} historical events to client ${clientId}`,
          );

          eventHistory.forEach((historyEvent, index) => {
            const historyMessage = `id: ${Date.now()}-${index}\nevent: ${historyEvent.event}\ndata: ${JSON.stringify(historyEvent.data)}\n\n`;
            controller.enqueue(encoder.encode(historyMessage));
          });
        }

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`SSE: Request aborted for client ${clientId}`);
          sseClient.isAlive = false;
          sseManager.removeClient(clientId);
        });

        // Handle connection close
        abortController.signal.addEventListener("abort", () => {
          console.log(`SSE: Abort controller triggered for client ${clientId}`);
          sseClient.isAlive = false;
          sseManager.removeClient(clientId);
        });
      },
      cancel() {
        console.log(`SSE: Stream cancelled for client ${clientId}`);
        const sseManager = getSSEManager();
        sseManager.removeClient(clientId);
      },
    });

    // Create the response with proper SSE headers
    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });

    console.log(`SSE: New connection established for client ${clientId}`);

    return response;
  } catch (error) {
    console.error("SSE: Error establishing connection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST endpoint for sending messages via SSE
 * This allows other parts of the application to send messages to connected clients
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, target, targetId } = body;

    if (!event || !data) {
      return new Response("Missing required fields: event, data", {
        status: 400,
      });
    }

    const sseManager = getSSEManager();
    sseManager.sendMessage({
      event,
      data,
      target: target || "all",
      targetId,
    });

    return new Response("Message sent", { status: 200 });
  } catch (error) {
    console.error("SSE: Error sending message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
