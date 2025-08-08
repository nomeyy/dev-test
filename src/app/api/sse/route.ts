import { type NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/lib/sse/sse-manager";
import { broadcast, sendToUser } from "@/lib/sse/sse-utils";
import {
  SSEEventEnum,
  SSETypeEnum,
  type SendEventRequest,
  type SendEventResponse,
} from "@/lib/sse/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get("userId");
  return sseManager.handleConnection(request, userId ?? undefined);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendEventRequest;
    const { type, event, data, userId } = body;
    if (!event || !data) {
      return NextResponse.json(
        { error: "Missing required fields: event and data" },
        { status: 400 },
      );
    }

    if (!Object.values(SSEEventEnum).includes(event)) {
      return NextResponse.json(
        { error: `Invalid event name: ${event}` },
        { status: 400 },
      );
    }
    let result: SendEventResponse;

    if (type === SSETypeEnum.user && userId) {
      const sentCount = sendToUser(userId, event, data);
      result = {
        success: true,
        sentCount,
        target: "user",
        userId,
      };
    } else {
      const sentCount = broadcast(event, data);
      result = {
        success: true,
        sentCount,
        target: "broadcast",
      };
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending SSE event:", error);
    return NextResponse.json(
      { error: "Failed to send event" },
      { status: 500 },
    );
  }
}
