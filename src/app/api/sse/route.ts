import { getSession } from "@/features/auth";
import {
  SSE_EVENT_TYPES,
  sseEventDispatcher,
  sseManager,
} from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";
import { NextRequest, NextResponse } from "next/server";

const { log, handleError } = createServiceContext("SSEApi");

export async function GET(request: NextRequest) {
  try {
    // DEV: Discord OAuth not configured
    // Bypass allows SSE testing without setting up Discord developer app
    // TODO: Configure Discord OAuth or switch to different auth provider
    const session = await getSession();
    const userId = session?.user?.id ?? "test-user-id";

    if (!session?.user?.id) {
      log.warn("No session found, using test user ID");
    }
    log.info("SSE connection request", { userId });

    const connection = sseManager.addConnection(userId);

    const response = new NextResponse(
      new ReadableStream({
        start(controller) {
          const connectEvent = `data: ${JSON.stringify({
            type: SSE_EVENT_TYPES.CONNECT,
            data: { connectionId: connection.id, userId },
            timestamp: Date.now(),
          })}\n\n`;

          controller.enqueue(new TextEncoder().encode(connectEvent));

          sseManager.setController(connection.id, controller);

          const heartbeatInterval = setInterval(() => {
            try {
              const heartbeatEvent = `data: ${JSON.stringify({
                type: SSE_EVENT_TYPES.HEARTBEAT,
                data: { timestamp: Date.now() },
                timestamp: Date.now(),
              })}\n\n`;

              controller.enqueue(new TextEncoder().encode(heartbeatEvent));
              sseManager.updatePing(connection.id);
            } catch (error) {
              log.error("Error sending heartbeat", {
                error,
                connectionId: connection.id,
              });
              clearInterval(heartbeatInterval);
            }
          }, 30000);

          request.signal.addEventListener("abort", () => {
            log.info("SSE client disconnected", {
              connectionId: connection.id,
              userId,
            });
            clearInterval(heartbeatInterval);
            sseManager.removeConnection(connection.id);
          });
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        },
      },
    );

    log.info("SSE connection established", {
      connectionId: connection.id,
      userId,
      totalConnections: sseManager.getStats().totalConnections,
    });

    return response;
  } catch (error) {
    handleError("establishing SSE connection", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // DEV: Discord OAuth not configured - AUTH_DISCORD_ID/AUTH_DISCORD_SECRET missing
    // Bypass allows SSE testing without setting up Discord developer app
    // TODO: Configure Discord OAuth or switch to different auth provider
    const session = await getSession();
    const userId = session?.user?.id ?? "test-user-id";

    const body = (await request.json()) as {
      eventType?: string;
      data?: Record<string, unknown>;
      targetUserId?: string;
    };
    const { eventType, data, targetUserId } = body;

    if (!eventType) {
      return new NextResponse("Missing eventType", { status: 400 });
    }

    const targetUser = targetUserId ?? userId;

    log.info("Sending SSE event via API", {
      userId,
      targetUser,
      eventType,
      data,
    });

    const success = sseEventDispatcher.sendToUser(targetUser, {
      type: eventType,
      data: data ?? {},
    });

    if (success) {
      return NextResponse.json({ success: true, message: "Event sent" });
    } else {
      return NextResponse.json(
        { success: false, message: "No active connections for user" },
        { status: 404 },
      );
    }
  } catch (error) {
    handleError("sending SSE event via API", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
