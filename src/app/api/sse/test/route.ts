import { NextRequest } from "next/server";
import {
  initializeSSE,
  broadcastToAll,
  sendToUser,
} from "../../../../features/sse/services/sse-service";
import { logger } from "@/utils/logging";

const sseLogger = logger.createContextLogger("SSE");

// Initialize SSE manager on module load
initializeSSE();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, target, targetId } = body;

    if (!event || !data) {
      return new Response("Missing event or data", { status: 400 });
    }

    // Send message based on target
    switch (target) {
      case "user":
        if (!targetId) {
          return new Response("Missing targetId for user target", {
            status: 400,
          });
        }
        sendToUser(targetId, event, data);
        break;

      case "all":
      default:
        broadcastToAll(event, data);
        break;
    }

    sseLogger.info(`Test message sent`, {
      event,
      target,
      targetId,
      timestamp: new Date().toISOString(),
    });

    return new Response("Message sent", { status: 200 });
  } catch (error) {
    sseLogger.error("Error in test endpoint", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
