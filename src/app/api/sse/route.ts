// app/api/sse/route.ts
import { NextRequest } from "next/server";
import { unifiedSSEService } from "../../../features/sse/unified-sse-service";
import { logger } from "@/utils/logging";

const routeLogger = logger.createContextLogger("SSE-Route");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId =
    searchParams.get("clientId") ||
    `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = searchParams.get("userId") || undefined;

  // Get client info
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") || undefined;

  routeLogger.info(`SSE connection attempt: ${clientId}`, { userId, ip });

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      // SSE headers setup
      // Write function for the SSE service
      const writeToStream = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch (error) {
          routeLogger.error(`Failed to write to stream for ${clientId}`, error);
          cleanup();
        }
      };

      // Cleanup function
      const cleanup = async () => {
        try {
          await unifiedSSEService.removeClient(clientId);
          controller.close();
        } catch (error) {
          routeLogger.error(`Cleanup error for ${clientId}`, error);
        }
      };

      // Add client to SSE service
      unifiedSSEService
        .addClient({
          id: clientId,
          userId,
          // sessionId,
          response: {
            write: writeToStream,
            close: cleanup,
          },
          ip,
          userAgent,
        })
        .catch((error) => {
          routeLogger.error(`Failed to add client ${clientId}`, error);
          cleanup();
        });

      // Handle client disconnect
      request.signal?.addEventListener("abort", () => {
        routeLogger.info(`Client disconnected: ${clientId}`);
        cleanup();
      });

      // Send initial connection message
      writeToStream(`: SSE connection established for ${clientId}\n\n`);
    },

    cancel() {
      routeLogger.info(`Stream cancelled for ${clientId}`);
      unifiedSSEService.removeClient(clientId);
    },
  });

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
