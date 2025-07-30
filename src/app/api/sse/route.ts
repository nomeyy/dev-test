import { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { sseManager } from "@/features/sse";
import { nanoid } from "nanoid";

/**
 * SSE endpoint for establishing real-time connections
 * GET /api/sse - Establishes SSE connection
 */
export async function GET(request: NextRequest) {
  try {
    // Get session information for user context
    const session = await auth();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") || nanoid();

    // Create connection ID
    const connectionId = nanoid();

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Add connection to SSE manager
        sseManager.addConnection(
          connectionId,
          controller,
          session?.user?.id,
          sessionId,
        );

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`SSE client disconnected: ${connectionId}`);
          sseManager.removeConnection(connectionId);
        });
      },
      cancel() {
        console.log(`SSE stream cancelled: ${connectionId}`);
        sseManager.removeConnection(connectionId);
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("SSE endpoint error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
