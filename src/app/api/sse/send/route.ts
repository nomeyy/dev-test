import { NextRequest, NextResponse } from "next/server";
import { sseConnectionManager } from "@/lib/sse/connection-manager";

/**
 * API endpoint for sending messages to SSE clients
 * This demonstrates how backend modules can send notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, targetId, message, type = "notification" } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    let sentCount = 0;
    const sseMessage = {
      type,
      data: {
        message,
        sentAt: new Date().toISOString(),
        target,
        targetId,
      },
    };

    switch (target) {
      case "client":
        if (!targetId) {
          return NextResponse.json(
            { error: "clientId is required for client target" },
            { status: 400 },
          );
        }
        const clientSent = sseConnectionManager.sendToClient(
          targetId,
          sseMessage,
        );
        sentCount = clientSent ? 1 : 0;
        break;

      case "user":
        if (!targetId) {
          return NextResponse.json(
            { error: "userId is required for user target" },
            { status: 400 },
          );
        }
        sentCount = sseConnectionManager.sendToUser(targetId, sseMessage);
        break;

      case "session":
        if (!targetId) {
          return NextResponse.json(
            { error: "sessionId is required for session target" },
            { status: 400 },
          );
        }
        sentCount = sseConnectionManager.sendToSession(targetId, sseMessage);
        break;

      case "broadcast":
      case "all":
        sentCount = sseConnectionManager.broadcast(sseMessage);
        break;

      default:
        return NextResponse.json(
          {
            error:
              "Invalid target. Use: client, user, session, broadcast, or all",
          },
          { status: 400 },
        );
    }

    const stats = sseConnectionManager.getStats();

    return NextResponse.json({
      success: true,
      sentCount,
      target,
      targetId,
      message: sseMessage,
      stats,
    });
  } catch (error) {
    console.error("SSE Send API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to retrieve connection statistics
 */
export async function GET() {
  try {
    const stats = sseConnectionManager.getStats();
    const clients = sseConnectionManager.getAllClients().map((client) => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastPing: client.lastPing,
    }));

    return NextResponse.json({
      success: true,
      stats,
      clients,
    });
  } catch (error) {
    console.error("SSE Stats API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
