import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/server";
import type { SSEConnectionOptions } from "@/lib/sse/types";

export async function GET(request: NextRequest) {
  try {
    // Parse connection options from query parameters
    const { searchParams } = new URL(request.url);
    const options: SSEConnectionOptions = {
      userId: searchParams.get("userId") || undefined,
      sessionId: searchParams.get("sessionId") || undefined,
      clientId: searchParams.get("clientId") || undefined,
    };

    // Generate a unique client ID if not provided
    const clientId =
      options.clientId ||
      `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a ReadableStream for the SSE connection
    const stream = new ReadableStream({
      start(controller) {
        // Create the client object
        const client = {
          id: clientId,
          userId: options.userId,
          sessionId: options.sessionId,
          response: new Response(),
          controller,
          lastPing: Date.now(),
          isConnected: true,
        };

        // Add client to the manager
        console.log(
          `SSE: Adding client ${clientId} with userId: ${options.userId}, sessionId: ${options.sessionId}`,
        );
        sseManager.addClient(client);

        // Send initial connection event
        const connectionEvent = {
          id: Date.now().toString(),
          event: "connected",
          data: JSON.stringify({
            clientId,
            userId: options.userId,
            sessionId: options.sessionId,
            timestamp: new Date().toISOString(),
          }),
        };

        const message = formatSSEMessage(connectionEvent);
        console.log(
          `SSE: 📤 Sending connection event to client ${clientId}:`,
          message,
        );
        controller.enqueue(new TextEncoder().encode(message));

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`SSE: 🚪 Client ${clientId} aborting connection`);

          // Check if client is still in our list before removing
          const currentClient = sseManager
            .getConnectedClients()
            .find((c) => c.id === clientId);
          if (currentClient) {
            console.log(
              `SSE: 🚪 Client ${clientId} is still in our list, removing`,
            );
            sseManager.removeClient(clientId);
          } else {
            console.log(
              `SSE: 🚪 Client ${clientId} not found in our list, skipping removal`,
            );
          }

          controller.close();
        });

        // Handle client disconnect via close
        request.signal.addEventListener("close", () => {
          console.log(`SSE: 🚪 Client ${clientId} closing connection`);

          // Check if client is still in our list before removing
          const currentClient = sseManager
            .getConnectedClients()
            .find((c) => c.id === clientId);
          if (currentClient) {
            console.log(
              `SSE: 🚪 Client ${clientId} is still in our list, removing`,
            );
            sseManager.removeClient(clientId);
          } else {
            console.log(
              `SSE: 🚪 Client ${clientId} not found in our list, skipping removal`,
            );
          }

          controller.close();
        });

        // Add error handler for the stream
        request.signal.addEventListener("error", (error) => {
          console.log(`SSE: 🚪 Client ${clientId} connection error:`, error);

          // Check if client is still in our list before removing
          const currentClient = sseManager
            .getConnectedClients()
            .find((c) => c.id === clientId);
          if (currentClient) {
            console.log(
              `SSE: 🚪 Client ${clientId} is still in our list, removing`,
            );
            sseManager.removeClient(clientId);
          } else {
            console.log(
              `SSE: 🚪 Client ${clientId} not found in our list, skipping removal`,
            );
          }

          controller.close();
        });

        console.log(`SSE: ✅ Client ${clientId} connection setup complete`);
      },
    });

    // Return the SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("SSE: Error establishing connection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Helper function to format SSE messages
function formatSSEMessage(event: {
  id?: string;
  event: string;
  data: string;
}): string {
  let message = "";

  if (event.id) {
    message += `id: ${event.id}\n`;
  }

  message += `event: ${event.event}\n`;
  message += `data: ${event.data}\n`;
  message += "\n";

  return message;
}
