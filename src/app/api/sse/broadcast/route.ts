import { type NextRequest, NextResponse } from "next/server";
import { sseConnectionManager } from "../../../../features/sse/server/SSEConnectionManager";

interface BroadcastEventPayload {
  event: string;
  data: object;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BroadcastEventPayload;

    // Validate required fields
    if (!body.event) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: event",
        },
        { status: 400 },
      );
    }

    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: data",
        },
        { status: 400 },
      );
    }

    // Get total connection count before broadcasting
    const totalConnections = sseConnectionManager.getTotalConnectionCount();
    const activeClients = sseConnectionManager.getActiveClients();

    // Broadcast event to all connected clients using "broadcast" target
    sseConnectionManager.sendEvent("broadcast", body.event, body.data);

    return NextResponse.json({
      success: true,
      message: "Event broadcasted successfully",
      event: body.event,
      recipients: totalConnections,
      activeClients: activeClients.length,
      clientIds: activeClients,
    });
  } catch (error) {
    console.error("[API] Error in /api/sse/broadcast:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while broadcasting event",
      },
      { status: 500 },
    );
  }
}
