import { NextRequest } from "next/server";
import { SSEManager } from "@/lib/sse/SSEManager";

// Extend globalThis to include __sseManager for type safety
declare global {
  var __sseManager: SSEManager | undefined;
}

// Singleton instance of SSEManager (in-memory for now)
const sseManager =
  global.__sseManager || (global.__sseManager = new SSEManager());

// Utility to generate a random client id
function generateClientId() {
  return Math.random().toString(36).substring(2, 15);
}

// Basic SSE endpoint handler for Next.js App Router
export async function GET(req: NextRequest) {
  // Create a unique id for this client
  const clientId = generateClientId();

  // Heartbeat interval in milliseconds
  const HEARTBEAT_INTERVAL = 20000; // 20 seconds

  // Variable to hold the heartbeat interval id
  let heartbeat: NodeJS.Timeout | undefined;

  // Create a ReadableStream to send SSE data
  const stream = new ReadableStream({
    start(controller) {
      // Utility function to send an SSE event
      function sendEvent(data: string, event?: string) {
        let payload = "";
        if (event) payload += `event: ${event}\n`;
        payload += `data: ${data}\n\n`;
        controller.enqueue(new TextEncoder().encode(payload));
      }

      // Register this client with the SSEManager
      sseManager.addClient({
        id: clientId,
        send: sendEvent,
        close: () => controller.close(),
      });

      // Send a test event when the client connects
      sendEvent(
        JSON.stringify({ message: "connected", clientId }),
        "connected",
      );

      // Start a heartbeat interval to keep the connection alive
      heartbeat = setInterval(() => {
        sendEvent(JSON.stringify({ ts: Date.now() }), "ping");
      }, HEARTBEAT_INTERVAL);
    },
    cancel() {
      // Remove the client from the SSEManager when the connection is closed
      sseManager.removeClient(clientId);
      // Cleanup the heartbeat interval
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  // Return the response with proper SSE headers
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Allow CORS from any origin (adjust as needed)
      "Access-Control-Allow-Origin": "*",
    },
  });
}
