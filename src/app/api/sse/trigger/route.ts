import { type NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";
import { logger } from "@/utils/logging";
import { SSE_CONFIG } from "@/lib/sse/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, userId } = body;

    if (!event || !data) {
      return new Response("Missing event or data", { status: 400 });
    }

    let successCount: number;

    if (userId) {
      // Send to specific user
      successCount = sseManager.sendToUser(userId, { event, data });
      logger.info(
        SSE_CONFIG.LOGGER.PREFIX,
        `Event sent to user ${userId}: ${successCount} clients`,
      );
    } else {
      // Broadcast to all connected clients
      successCount = sseManager.broadcast({ event, data });
      logger.info(
        SSE_CONFIG.LOGGER.PREFIX,
        `Event broadcast to ${successCount} clients`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        clientsReached: successCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    logger.error(SSE_CONFIG.LOGGER.PREFIX, "Trigger endpoint error", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
