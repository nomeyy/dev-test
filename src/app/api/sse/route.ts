import { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import {
  initializeSSE,
  registerSSEClient,
  removeSSEClient,
  generateClientId,
} from "../../../features/sse/services/sse-service";
import { logger } from "@/utils/logging";

const sseLogger = logger.createContextLogger("SSE");

// Initialize SSE manager on module load
initializeSSE();

export async function GET(request: NextRequest) {
  sseLogger.info("SSE GET request received");
  try {
    // Get session for user identification
    let session;
    let userId;
    let sessionId;

    try {
      session = await auth();
      userId = session?.user?.id;
      sessionId = session?.user?.id;
      sseLogger.info("Auth successful", { userId, sessionId });
    } catch (authError) {
      sseLogger.warn("Auth failed, continuing without user identification", {
        error:
          authError instanceof Error ? authError.message : "Unknown auth error",
        stack: authError instanceof Error ? authError.stack : undefined,
      });
      userId = undefined;
      sessionId = undefined;
    }

    // Generate unique client ID
    const clientId = generateClientId();

    // Create SSE response headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    };

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = {
          event: "connected",
          data: {
            clientId,
            userId,
            timestamp: Date.now(),
            message: "SSE connection established",
          },
        };

        const sseData = `event: ${initialMessage.event}\ndata: ${JSON.stringify(initialMessage.data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(sseData));

        // Register client with SSE manager
        sseLogger.info(`Attempting to register client ${clientId}`, {
          userId,
          sessionId,
        });

        const success = registerSSEClient(clientId, controller, {
          userId,
          sessionId,
          clientId,
        });

        if (!success) {
          sseLogger.error(
            `Failed to register client ${clientId} - maximum connections reached`,
          );
          const errorMessage = {
            event: "error",
            data: {
              message: "Maximum connections reached",
              timestamp: Date.now(),
            },
          };

          const errorData = `event: ${errorMessage.event}\ndata: ${JSON.stringify(errorMessage.data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
          return;
        }

        sseLogger.info(`Successfully registered client ${clientId}`);

        sseLogger.info(`Client ${clientId} connected via API`, {
          userId,
          sessionId,
        });

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          removeSSEClient(clientId);
          controller.close();
          sseLogger.info(`Client ${clientId} disconnected via API`);
        });
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    sseLogger.error("Error in GET handler", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Handle preflight requests
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
