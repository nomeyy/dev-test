import type { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";
import { type SSEEvent } from "@/features/sse/types";

interface TestRequestBody {
  event?: string;
  data?: unknown;
  target?: {
    clientId?: string;
    userId?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TestRequestBody;
    const { event, data, target } = body;

    console.log("SSE Test API: Received request:", { event, data, target });
    console.log("SSE Test API: Active clients:", sseManager.getClientCount());

    const sseEvent: SSEEvent = {
      event: event ?? "notification",
      data: data ?? { message: "Test event" },
    };

    console.log("SSE Test API: Broadcasting event:", sseEvent);

    if (target?.clientId) {
      console.log("SSE Test API: Sending to specific client:", target.clientId);
      sseManager.sendToClient(target.clientId, sseEvent);
    } else if (target?.userId) {
      console.log("SSE Test API: Sending to user:", target.userId);
      sseManager.sendToUser(target.userId, sseEvent);
    } else {
      console.log("SSE Test API: Broadcasting to all clients");
      sseManager.broadcast(sseEvent);
    }

    return Response.json({
      success: true,
      message: "Event sent successfully",
      clientCount: sseManager.getClientCount(),
    });
  } catch (error) {
    console.error("Error sending SSE event:", error);
    return Response.json(
      { success: false, message: "Failed to send event" },
      { status: 500 },
    );
  }
}
