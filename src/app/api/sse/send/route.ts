import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SSEManager } from "@/features/sse";
import { logger } from "@/utils/logging";

/**
 * API endpoint for sending SSE events.
 * This is primarily for testing and manual event sending.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      event?: string;
      data: unknown;
      clientId?: string;
      userId?: string;
      broadcast?: boolean;
    };

    const { event, data, clientId, userId, broadcast } = body;

    if (!data) {
      return NextResponse.json(
        { error: "Missing required field: data" },
        { status: 400 },
      );
    }

    const sseManager = SSEManager.getInstance();
    let result: number | boolean;

    if (broadcast) {
      // Broadcast to all clients
      result = await sseManager.broadcastToAll({ event, data });
      logger.info("SSE_SEND", `Broadcasted event to ${result} clients`, {
        event,
        data,
      });
    } else if (userId) {
      // Send to specific user
      result = await sseManager.sendToUser(userId, { event, data });
      logger.info(
        "SSE_SEND",
        `Sent event to user ${userId}, reached ${result} clients`,
        { event, data },
      );
    } else if (clientId) {
      // Send to specific client
      result = await sseManager.sendToClient(clientId, { event, data });
      logger.info(
        "SSE_SEND",
        `Sent event to client ${clientId}, success: ${result}`,
        { event, data },
      );
    } else {
      return NextResponse.json(
        { error: "Must specify either clientId, userId, or broadcast: true" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      result:
        typeof result === "number"
          ? `Sent to ${result} clients`
          : `Success: ${result}`,
    });
  } catch (error) {
    logger.error("SSE_SEND", "Error sending SSE event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Get SSE statistics
 */
export async function GET() {
  try {
    const sseManager = SSEManager.getInstance();
    const stats = await sseManager.getStats();
    const clients = await sseManager.getActiveClients();

    return NextResponse.json({
      ...stats,
      clients: clients.map((client) => ({
        id: client.id,
        userId: client.userId,
        sessionId: client.sessionId,
        lastPing: client.lastPing,
        metadata: client.metadata,
      })),
    });
  } catch (error) {
    logger.error("SSE_SEND", "Error getting SSE stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
