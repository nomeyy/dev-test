import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSSEManager } from "@/features/sse";
import { getSession } from "@/features/auth";

/**
 * API endpoint to send SSE notifications
 * POST /api/sse/notify
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      event: string;
      data: unknown;
      targetUserId?: string;
      targetClientIds?: string[];
      broadcast?: boolean;
    };

    const {
      event,
      data,
      targetUserId,
      targetClientIds,
      broadcast = false,
    } = body;

    if (!event || data === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: event, data" },
        { status: 400 },
      );
    }

    const sseManager = getSSEManager();
    let sentCount = 0;

    const sseEvent = {
      event,
      data,
      id: `${event}_${Date.now()}`,
    };

    if (broadcast) {
      // Broadcast to all clients
      sentCount = sseManager.broadcast(sseEvent);
    } else if (targetUserId) {
      // Send to specific user
      sentCount = sseManager.sendToUser(targetUserId, sseEvent);
    } else if (targetClientIds && targetClientIds.length > 0) {
      // Send to specific clients
      sentCount = sseManager.sendToClients(sseEvent, {
        clientIds: targetClientIds,
      });
    } else {
      // Default: send to current user
      sentCount = sseManager.sendToUser(session.user.id, sseEvent);
    }

    return NextResponse.json({
      success: true,
      sentCount,
      event: sseEvent,
    });
  } catch (error) {
    console.error("SSE notify endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
