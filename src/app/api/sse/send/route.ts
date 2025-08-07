// app/api/sse/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { unifiedSSEService } from "../../../../features/sse/unified-sse-service";
import { logger } from "@/utils/logging";

const sendLogger = logger.createContextLogger("SSE-Send");

interface SendEventRequest {
  event: string;
  data: unknown;
  target?: {
    type: "client" | "broadcast";
    id?: string;
  };
  clientId?: string; // Backward compatibility
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEventRequest = await request.json();
    const { event, data, target, clientId } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 },
      );
    }

    let result: number | boolean = 0;
    let targetInfo = "";

    // Determine target from new format or backward compatibility
    if (target) {
      switch (target.type) {
        case "client":
          if (!target.id) {
            return NextResponse.json(
              { error: "Client ID is required for client target" },
              { status: 400 },
            );
          }
          result = await unifiedSSEService.sendToClient(target.id, event, data);
          targetInfo = `client ${target.id}`;
          break;

        case "broadcast":
          result = await unifiedSSEService.broadcast(event, data);
          targetInfo = "all clients";
          break;

        default:
          return NextResponse.json(
            {
              error:
                "Invalid target type. Must be one of: client, user, session, broadcast",
            },
            { status: 400 },
          );
      }
    } else {
      // Backward compatibility
      if (clientId) {
        result = await unifiedSSEService.sendToClient(clientId, event, data);
        targetInfo = `client ${clientId}`;
      } else {
        result = await unifiedSSEService.broadcast(event, data);
        targetInfo = "all clients";
      }
    }

    const success = typeof result === "boolean" ? result : result > 0;
    const count = typeof result === "number" ? result : result ? 1 : 0;

    sendLogger.info(`Event '${event}' sent to ${targetInfo}`, {
      success,
      count,
      event,
      targetInfo,
    });

    return NextResponse.json({
      success,
      message: `Event '${event}' sent to ${targetInfo}`,
      recipientCount: count,
    });
  } catch (error) {
    sendLogger.error("Failed to send SSE event", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// For development/testing - GET method to send test events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const event = searchParams.get("event") || "test";
  const message = searchParams.get("message") || "Test message";
  const clientId = searchParams.get("clientId");

  try {
    let result: number | boolean = 0;
    let targetInfo = "";

    if (clientId) {
      result = await unifiedSSEService.sendToClient(clientId, event, {
        message,
        timestamp: Date.now(),
      });
      targetInfo = `client ${clientId}`;
    } else {
      result = await unifiedSSEService.broadcast(event, {
        message,
        timestamp: Date.now(),
      });
      targetInfo = "all clients";
    }

    const success = typeof result === "boolean" ? result : result > 0;
    const count = typeof result === "number" ? result : result ? 1 : 0;

    return NextResponse.json({
      success,
      message: `Test event sent to ${targetInfo}`,
      recipientCount: count,
    });
  } catch (error) {
    sendLogger.error("Failed to send test event", error);
    return NextResponse.json(
      { error: "Failed to send test event" },
      { status: 500 },
    );
  }
}
