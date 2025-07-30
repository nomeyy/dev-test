import { NextRequest } from "next/server";
import {
  sseConnectionManager,
  type SSEClient,
} from "@/lib/sse/connection-manager";

/**
 * Enhanced SSE endpoint with connection tracking and management
 * Supports user/session-based client identification and targeted messaging
 */
export async function GET(request: NextRequest) {
  console.log("SSE: New client connection attempt");

  // Extract user/session info from query params or headers
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || undefined;
  const sessionId = url.searchParams.get("sessionId") || undefined;

  // Generate unique client ID
  const clientId = sseConnectionManager.generateClientId();

  console.log("SSE: Client info", { clientId, userId, sessionId });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log(`SSE: Stream started for client ${clientId}`);

      const encoder = new TextEncoder();

      // Create client object
      const client: SSEClient = {
        id: clientId,
        userId,
        sessionId,
        controller,
        encoder,
        connectedAt: new Date(),
      };

      // Add client to connection manager
      sseConnectionManager.addClient(client);

      // Send initial connection confirmation with client info
      sseConnectionManager.sendToClient(clientId, {
        type: "connection",
        data: {
          message: "Connected to SSE stream",
          clientId,
          userId,
          sessionId,
          connectedAt: client.connectedAt.toISOString(),
        },
      });

      // Send connection stats after 1 second
      const statsTimeout = setTimeout(() => {
        const stats = sseConnectionManager.getStats();
        sseConnectionManager.sendToClient(clientId, {
          type: "stats",
          data: {
            message: "Connection statistics",
            stats,
          },
        });
      }, 1000);

      // Send a test message after 3 seconds
      const testTimeout = setTimeout(() => {
        sseConnectionManager.sendToClient(clientId, {
          type: "test",
          data: {
            message: "This is a test message from the server",
            clientId,
          },
        });
      }, 3000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        console.log(`SSE: Client ${clientId} disconnected`);
        clearTimeout(statsTimeout);
        clearTimeout(testTimeout);

        // Remove client from connection manager
        sseConnectionManager.removeClient(clientId);

        try {
          controller.close();
        } catch (error) {
          console.error("SSE: Error closing controller:", error);
        }
      });
    },
  });

  // Return SSE response with proper headers
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
