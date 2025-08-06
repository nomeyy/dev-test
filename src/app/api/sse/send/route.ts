import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sseManager } from "@/features/sse";
import type { SSEMessage } from "@/features/sse";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SSEMessage;
    const { event, data, target } = body;

    if (!event || !data) {
      return NextResponse.json(
        { error: "Missing required fields: event and data" },
        { status: 400 },
      );
    }

    sseManager.sendMessage({
      event,
      data,
      target: target ?? "all",
    });

    return NextResponse.json({
      success: true,
      message: "SSE message sent successfully",
      clientCount: sseManager.getClientCount(),
    });
  } catch (error) {
    console.error("Error sending SSE message:", error);
    return NextResponse.json(
      { error: "Failed to send SSE message" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    connectedClients: sseManager.getClientCount(),
    clients: sseManager.getConnectedClients().map((client) => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      lastPing: client.lastPing,
    })),
  });
}
