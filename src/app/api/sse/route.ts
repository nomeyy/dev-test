import type { NextRequest } from "next/server";

/**
 * Server-Sent Events (SSE) endpoint for establishing real-time connections
 *
 * This endpoint creates a persistent HTTP connection that allows the server
 * to push real-time updates to connected clients. It implements the SSE
 * specification using ReadableStream for optimal browser compatibility.
 *
 * Features:
 * - Automatic connection establishment with immediate confirmation
 * - Periodic heartbeat messages to maintain connection
 * - Proper CORS headers for cross-origin requests
 * - Graceful error handling and connection cleanup
 * - Global controller sharing for multi-endpoint messaging
 *
 * @param request - The incoming HTTP request
 * @returns Response with SSE stream or error response
 */
export async function GET(_request: NextRequest) {
  try {
    // Set SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Future enhancement: Add authentication and user-specific connection tracking
    // const session = await getSession();
    // const userId = session?.user?.id;

    // Create SSE stream using ReadableStream for optimal browser compatibility
    const encoder = new TextEncoder();
    const connectionId = crypto.randomUUID();

    const stream = new ReadableStream({
      start(controller) {
        // Store controller globally so test API can use it
        (global as Record<string, unknown>).sseController = controller;
        (global as Record<string, unknown>).sseEncoder = encoder;

        // Send immediate connected event
        const connectedMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: connected`,
          `data: ${JSON.stringify({
            connectionId,
            timestamp: new Date().toISOString(),
            message: "Connected successfully!",
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(connectedMessage));

        // Send periodic heartbeat messages to maintain connection
        const interval = setInterval(() => {
          try {
            const heartbeatMessage = [
              `id: ${crypto.randomUUID()}`,
              `event: ping`,
              `data: ${JSON.stringify({
                message: "Heartbeat",
                timestamp: new Date().toISOString(),
                connectionId,
              })}`,
              "",
              "",
            ].join("\n");

            controller.enqueue(encoder.encode(heartbeatMessage));
          } catch {
            clearInterval(interval);
          }
        }, 10000);

        // Cleanup function called when stream is closed
        return () => {
          clearInterval(interval);
          delete (global as Record<string, unknown>).sseController;
          delete (global as Record<string, unknown>).sseEncoder;
        };
      },
      cancel() {
        delete (global as Record<string, unknown>).sseController;
        delete (global as Record<string, unknown>).sseEncoder;
      },
    });

    return new Response(stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

/**
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
    },
  });
}
