import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/handlers";
import { getSSEManager } from "@/features/sse";
import { logger } from "@/utils/logging";
import type { SSEClient, SSEConnectionOptions } from "@/features/sse/types";

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await auth();

    // Extract connection options from query parameters
    const { searchParams } = new URL(request.url);
    const userId = session?.user?.id;
    const sessionId = searchParams.get("sessionId") || `session-${Date.now()}`;
    const metadata = searchParams.get("metadata")
      ? JSON.parse(searchParams.get("metadata")!)
      : {};

    const connectionOptions: SSEConnectionOptions = {
      userId,
      sessionId,
      metadata,
      heartbeatInterval: parseInt(
        searchParams.get("heartbeatInterval") || "30000",
      ),
      maxReconnectTime: parseInt(
        searchParams.get("maxReconnectTime") || "5000",
      ),
    };

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create SSE client
        const client: SSEClient = {
          id: clientId,
          userId: connectionOptions.userId,
          sessionId: connectionOptions.sessionId,
          headers: request.headers,
          send: (data: string) => {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (error: unknown) {
              logger.error(
                "SSE",
                `Failed to send data to client ${clientId}`,
                error,
              );
              controller.close();
            }
          },
          close: () => {
            try {
              controller.close();
            } catch (error: unknown) {
              logger.error("SSE", `Failed to close client ${clientId}`, error);
            }
          },
          isConnected: true,
          lastActivity: Date.now(),
          metadata: connectionOptions.metadata,
        };

        // Add client to manager
        getSSEManager()
          .addClient(client)
          .then(() => {
            logger.info(
              "SSE",
              `Client ${clientId} successfully added to manager`,
            );
          })
          .catch((error: unknown) => {
            logger.error(
              "SSE",
              `Failed to add client ${clientId} to manager`,
              error,
            );
            controller.close();
          });

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          logger.info("SSE", `Client ${clientId} disconnected (abort signal)`);
          getSSEManager().removeClient(clientId);
          controller.close();
        });

        // Handle stream close
        const originalClose = controller.close.bind(controller);
        controller.close = () => {
          logger.info("SSE", `Client ${clientId} disconnected (stream close)`);
          getSSEManager().removeClient(clientId);
          originalClose();
        };
      },
    });

    // Set SSE headers
    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "Access-Control-Allow-Methods": "GET",
      },
    });

    return response;
  } catch (error: unknown) {
    logger.error("SSE", "Failed to establish SSE connection", error);
    return NextResponse.json(
      { error: "Failed to establish SSE connection" },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
