/**
 * SSE Test API Route
 * -----------------
 * Endpoint for testing SSE functionality by sending events
 */

import { type NextRequest, NextResponse } from "next/server";
import { getSSEManager } from "@/features/sse";
import { auth } from "@/features/auth/handlers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authentication session
    const session = await auth();
    const userId = session?.user?.id;

    // Parse request body
    const body = await request.json();
    const { type, data, filter } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: "Missing required fields: type, data" },
        { status: 400 },
      );
    }

    // Get SSE manager and send event
    const sseManager = getSSEManager();

    // If no filter provided and user is authenticated, send to that user only
    const eventFilter = filter || (userId ? { userIds: [userId] } : undefined);

    const event = {
      type,
      data,
      id: `test-${Date.now()}`,
    };

    const sentCount = eventFilter
      ? await sseManager.sendEvent(event, eventFilter)
      : await sseManager.broadcast(event);

    return NextResponse.json({
      success: true,
      sentCount,
      event,
      filter: eventFilter,
    });
  } catch (error) {
    console.error("SSE test endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const sseManager = getSSEManager();
    const stats = {
      totalConnections: sseManager.getConnectionCount(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("SSE test stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
