import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/features/auth";
import { sseManager } from "@/features/sse";

/**
 * SSE endpoint for real-time server-to-client notifications
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Get session for user identification
    const session = await getSession();
    const userId = session?.user?.id;
    // Use a unique identifier for the session - could be session token or user ID
    const sessionId = session?.user?.id
      ? `session_${session.user.id}`
      : undefined;

    // Generate unique client ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Add client to manager (without passing stream to avoid circular reference)
        sseManager
          .addClient(
            clientId,
            request,
            new Response(),
            controller,
            null,
            userId,
            sessionId,
          )
          .then(() => {
            // Send initial connection event
            const initialEvent = {
              id: Date.now().toString(),
              event: "connected",
              data: JSON.stringify({
                clientId,
                userId,
                timestamp: Date.now(),
                message: "SSE connection established",
              }),
            };

            const eventString =
              `id: ${initialEvent.id}\n` +
              `event: ${initialEvent.event}\n` +
              `data: ${initialEvent.data}\n\n`;

            controller.enqueue(new TextEncoder().encode(eventString));

            // Start heartbeat mechanism
            const heartbeatInterval = setInterval(() => {
              try {
                const heartbeatEvent = {
                  id: Date.now().toString(),
                  event: "ping",
                  data: JSON.stringify({
                    timestamp: Date.now(),
                    message: "heartbeat",
                  }),
                };

                const heartbeatString =
                  `id: ${heartbeatEvent.id}\n` +
                  `event: ${heartbeatEvent.event}\n` +
                  `data: ${heartbeatEvent.data}\n\n`;

                controller.enqueue(new TextEncoder().encode(heartbeatString));
              } catch (error) {
                console.error("Heartbeat error:", error);
                clearInterval(heartbeatInterval);
                sseManager.removeClient(clientId);
                controller.close();
              }
            }, 30000); // Send heartbeat every 30 seconds

            // Handle client disconnect
            request.signal.addEventListener("abort", () => {
              clearInterval(heartbeatInterval);
              sseManager.removeClient(clientId);
              controller.close();
            });
          })
          .catch((error) => {
            console.error("Failed to add client:", error);
            controller.error(error);
          });
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error("SSE connection error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
