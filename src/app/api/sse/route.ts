import { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { randomUUID } from "crypto";

// Simple in-memory client tracking (for demonstration)
const clients = new Map<string, {
  id: string;
  userId?: string;
  controller: ReadableStreamDefaultController;
  lastActivity: number;
}>();

/**
 * Handle SSE connection request
 */
export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await auth();
    
    // For testing purposes, allow anonymous connections
    // In production, you would require authentication
    const userId = session?.user?.id ?? "anonymous";

    // Generate client ID
    const clientId = `sse-${randomUUID()}`;

    // Create SSE response stream
    const stream = new ReadableStream({
      start(controller) {
        // Store client
        clients.set(clientId, {
          id: clientId,
          userId,
          controller,
          lastActivity: Date.now(),
        });

        // Send connection success event
        const successEvent = {
          type: "system_message",
          data: {
            message: "SSE connection established",
            code: "CONNECTION_SUCCESS",
            clientId,
          },
          timestamp: Date.now(),
        };
        
        const eventData = `event: ${successEvent.type}\ndata: ${JSON.stringify(successEvent.data)}\nid: ${Date.now()}\ntimestamp: ${successEvent.timestamp}\n\n`;
        controller.enqueue(new TextEncoder().encode(eventData));

        console.log(`SSE connection established: ${clientId} (user: ${userId})`);

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          const client = clients.get(clientId);
          if (!client) {
            clearInterval(heartbeatInterval);
            return;
          }

          const heartbeatEvent = {
            type: "heartbeat",
            data: { timestamp: Date.now() },
            timestamp: Date.now(),
          };
          
          const heartbeatData = `event: ${heartbeatEvent.type}\ndata: ${JSON.stringify(heartbeatEvent.data)}\nid: ${Date.now()}\ntimestamp: ${heartbeatEvent.timestamp}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatData));
          client.lastActivity = Date.now();
        }, 30000);

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`SSE client disconnected: ${clientId}`);
          clients.delete(clientId);
          clearInterval(heartbeatInterval);
        });
      },
    });

    // Create SSE headers
    const headers = new Headers();
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "Cache-Control");
    headers.set("Access-Control-Allow-Methods", "GET");

    // Return SSE response
    return new Response(stream, { headers });

  } catch (error) {
    console.error("SSE connection error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

// Export clients for testing (in a real app, this would be in a service)
export { clients }; 