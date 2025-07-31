import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/features/auth/handlers";
import { getSSEManager } from "@/features/sse/services";
import type { SSEEvent } from "@/features/sse/types";

/**
 * SSE Connection endpoint
 * Establishes a Server-Sent Events connection for authenticated users
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") ?? "unknown";
    const ipAddress =
      headersList.get("x-forwarded-for") ??
      headersList.get("x-real-ip") ??
      "unknown";

    // Get SSE manager instance
    const sseManager = getSSEManager();

    // Add connection to manager (automatically removes old connections)
    const connection = await sseManager.addConnection({
      request,
      userId: session.user.id,
      userAgent,
      ipAddress,
    });

    console.log("connection", connection);

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Register the stream controller with the SSE manager (one per user)
        sseManager.registerStreamController(session.user.id, controller);

        // Send initial connection event
        const connectionEvent: SSEEvent = {
          type: "user.online",
          data: {
            connectionId: connection.id,
            message: "Connected to SSE stream",
          },
          timestamp: new Date(),
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(connectionEvent)}\n\n`),
        );

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeatEvent: SSEEvent = {
              type: "system.alert",
              data: { type: "heartbeat" },
              timestamp: new Date(),
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(heartbeatEvent)}\n\n`),
            );

            // Update connection activity
            void sseManager.updateConnectionActivity(connection.id);
          } catch (error) {
            console.error("Heartbeat error:", error);
            // Controller is likely closed, clear interval and cleanup
            clearInterval(heartbeatInterval);
            void sseManager.removeConnection(connection.id);
          }
        }, 30000);

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch (error) {
            console.error("Error closing controller on abort:", error);
          }
          void sseManager.removeConnection(connection.id);
        });

        // Handle stream close
        request.signal.addEventListener("close", () => {
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch (error) {
            console.error("Error closing controller on close:", error);
          }
          void sseManager.removeConnection(connection.id);
        });
      },
    });

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
    console.error("SSE connection error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
