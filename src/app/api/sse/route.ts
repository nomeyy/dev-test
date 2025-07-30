import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { sseService } from "../../../features/sse/services/sse-service";
import type { SSEClient } from "../../../types/sse";
import { logger } from "../../../utils/logging";
import { randomUUID } from "crypto";

/**
 * Server-Sent Events endpoint
 * Establishes SSE connection with authenticated clients and maintains real-time communication
 *
 * @param request - The incoming HTTP request
 * @returns ReadableStream for SSE communication
 */
export async function GET(request: NextRequest) {
  const contextLogger = logger.createContextLogger("SSE-API");

  try {
    // Get session for authentication (optional - can support anonymous connections)
    const session = await auth();

    // Extract client information
    const clientId = randomUUID();
    const sessionId = request.headers.get("x-session-id") ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    contextLogger.info("New SSE connection request", {
      clientId,
      userId: session?.user?.id,
      sessionId,
      ip,
    });

    // Create readable stream for SSE
    const stream = new ReadableStream<string>({
      start(controller) {
        const client: SSEClient = {
          id: clientId,
          userId: session?.user?.id,
          sessionId,
          connectedAt: new Date(),
          lastActivity: new Date(),
          controller,
          metadata: {
            userAgent,
            ip,
          },
        };

        // Add client to service
        sseService.addClient(client).catch((error) => {
          contextLogger.error("Failed to add SSE client", error, { clientId });
          controller.error(error);
        });

        contextLogger.info("SSE client connected", { clientId });
      },

      cancel() {
        // Clean up when client disconnects
        sseService.removeClient(clientId).catch((error) => {
          contextLogger.error("Failed to remove SSE client", error, {
            clientId,
          });
        });

        contextLogger.info("SSE client disconnected", { clientId });
      },
    });

    // Return SSE response with appropriate headers
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    contextLogger.error("Failed to establish SSE connection", error);

    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Cache-Control, Content-Type, X-Session-ID",
    },
  });
}
