import { NextRequest, NextResponse } from "next/server";
import { SSE } from "@/lib/sse";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, target, clientId, broadcast } = body;

    const pingData = {
      message: message || "Manual ping from server",
      timestamp: new Date().toISOString(),
      type: "manual",
    };

    let sentCount = 0;

    if (broadcast || target === "all" || !target) {
      // Broadcast to all clients
      sentCount = SSE.broadcast("ping", pingData);
    } else if (clientId) {
      // Send to specific client
      const success = SSE.toClient(clientId, "ping", pingData);
      sentCount = success ? 1 : 0;
    } else if (target?.userId) {
      // Send to specific user
      sentCount = SSE.toUser(target.userId, "ping", pingData);
    } else if (target?.sessionId) {
      // Send to specific session
      sentCount = SSE.toSession(target.sessionId, "ping", pingData);
    } else if (target?.clientId) {
      // Send to specific client (legacy format)
      const success = SSE.toClient(target.clientId, "ping", pingData);
      sentCount = success ? 1 : 0;
    }

    return NextResponse.json({
      success: true,
      message: `Ping sent to ${sentCount} client(s)`,
      sentCount,
      data: pingData,
    });
  } catch (error) {
    console.error("SSE: Error sending ping:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send ping",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const stats = SSE.getStats();

    return NextResponse.json({
      success: true,
      stats,
      message: `Currently ${stats.totalClients} clients connected`,
    });
  } catch (error) {
    console.error("SSE: Error getting ping stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get ping stats",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
