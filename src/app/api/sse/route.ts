import { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { sseManager } from "../../../features/sse/services/sse-manager";

/**
 * SSE endpoint for real-time server-to-client notifications
 *
 * This endpoint establishes a Server-Sent Events connection with clients
 * and manages the connection lifecycle including authentication and cleanup.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // If it's a status check request
  if (searchParams.get("status") === "true") {
    const stats = sseManager.getStats();
    return Response.json({
      success: true,
      stats,
      timestamp: Date.now(),
    });
  }

  // Regular SSE connection logic
  let actualClientId: string | null = null;

  try {
    // Get user session for authentication
    const session = await getSession();

    // Extract connection parameters from query string
    const clientId = searchParams.get("clientId");
    const sessionId = searchParams.get("sessionId");

    console.log("SSE: New connection request", {
      clientId,
      sessionId,
      userId: session?.user?.id,
    });

    // Log current SSE manager stats
    const stats = sseManager.getStats();
    console.log("SSE: Current manager stats before connection:", stats);

    // Create SSE response stream
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Add client to SSE manager
          actualClientId = sseManager.addClient(controller, {
            userId: session?.user?.id,
            sessionId: sessionId || undefined,
            clientId: clientId || undefined,
          });

          console.log("SSE: Client added successfully", { actualClientId });

          // Log updated stats
          const updatedStats = sseManager.getStats();
          console.log(
            "SSE: Updated manager stats after adding client:",
            updatedStats,
          );

          // Send immediate connection confirmation
          const connectionData = JSON.stringify({
            clientId: actualClientId,
            timestamp: Date.now(),
          });
          const connectionEvent = `event: connected\ndata: ${connectionData}\nid: ${Date.now()}\n\n`;
          console.log("SSE: Sending connection event:", connectionEvent);
          controller.enqueue(new TextEncoder().encode(connectionEvent));

          // Handle client disconnect
          const handleAbort = () => {
            if (actualClientId) {
              console.log("SSE: Client disconnected", { actualClientId });
              sseManager.removeClient(actualClientId);
            }
          };

          request.signal.addEventListener("abort", handleAbort);
        } catch (error) {
          console.error("SSE: Error in stream start", error);
          controller.error(error);
        }
      },
      cancel() {
        // Cleanup when stream is cancelled
        if (actualClientId) {
          console.log("SSE: Stream cancelled", { actualClientId });
          sseManager.removeClient(actualClientId);
        }
      },
    });

    // Return SSE response with proper headers
    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });

    console.log(
      "SSE: Returning response with headers:",
      Object.fromEntries(response.headers.entries()),
    );
    return response;
  } catch (error) {
    console.error("SSE: Error establishing connection:", error);

    // Clean up client if it was added
    if (actualClientId) {
      sseManager.removeClient(actualClientId);
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST endpoint for sending messages to SSE clients
 * This allows other parts of the application to send notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, target = "all", targetId } = body;

    if (!event || !data) {
      return new Response("Missing event or data", { status: 400 });
    }

    const message = { event, data, target, targetId };
    let sentCount = 0;

    switch (target) {
      case "all":
        sentCount = sseManager.broadcast(message);
        break;
      case "user":
        if (!targetId) {
          return new Response("Missing targetId for user target", {
            status: 400,
          });
        }
        sentCount = sseManager.sendToUser(targetId, message);
        break;
      case "session":
        if (!targetId) {
          return new Response("Missing targetId for session target", {
            status: 400,
          });
        }
        sentCount = sseManager.sendToSession(targetId, message);
        break;
      case "client":
        if (!targetId) {
          return new Response("Missing targetId for client target", {
            status: 400,
          });
        }
        const sent = sseManager.sendToClient(targetId, message);
        sentCount = sent ? 1 : 0;
        break;
      default:
        return new Response("Invalid target", { status: 400 });
    }

    return Response.json({
      success: true,
      sentCount,
      message: `Message sent to ${sentCount} client(s)`,
    });
  } catch (error) {
    console.error("SSE: Error sending message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
