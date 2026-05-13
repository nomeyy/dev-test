/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { type NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { sseManager } from "../../../features/sse/services/sse-manager";
import { sseService } from "../../../features/sse/services/sse-service";

/**
 * SSE endpoint for establishing real-time connections
 *
 * This endpoint:
 * 1. Validates user authentication
 * 2. Creates a streaming response
 * 3. Registers the connection with the SSE manager
 * 4. Sends a welcome message
 * 5. Handles connection cleanup on close
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name || undefined;

    // Extracting client metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded
      ? forwarded.split(",")[0]?.trim()
      : request.headers.get("x-real-ip") || undefined;

    console.log(`[SSE] New connection attempt from user ${userId}`);

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // const writer = controller;
        // const encoder = new TextEncoder();

        const sseWriter = {
          write: async (data: Uint8Array) => {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error("[SSE] Writer error:", error);
              throw error;
            }
          },
          close: () => {
            try {
              controller.close();
            } catch (error) {
              console.warn("[SSE] Controller already closed:", error);
            }
          },
        } as WritableStreamDefaultWriter<Uint8Array>;

        // Register the connection
        const connectionId = sseManager.addConnection(userId, sseWriter, {
          userAgent,
          clientIp,
        });

        console.log(`[SSE] Connection established: ${connectionId}`);

        // Send welcome message
        sseService.sendWelcomeMessage(userId, userName).catch((error) => {
          console.error("[SSE] Failed to send welcome message:", error);
        });

        // Store connection ID for cleanup
        interface SseRequest extends NextRequest {
          _sseConnectionId?: string;
        }
        (request as SseRequest)._sseConnectionId = connectionId;
      },

      cancel(reason) {
        console.log(`[SSE] Connection cancelled:`, reason);
        interface SseRequest extends NextRequest {
          _sseConnectionId?: string;
        }
        const connectionId = (request as SseRequest)._sseConnectionId;
        if (connectionId) {
          sseManager.removeConnection(connectionId);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "Access-Control-Allow-Credentials": "true",
        // Disable buffering for Nginx and other proxies
        "X-Accel-Buffering": "no",
        // Additional headers for better SSE support
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("[SSE] Error establishing connection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Cache-Control",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
