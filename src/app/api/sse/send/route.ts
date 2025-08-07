import { type NextRequest, NextResponse } from "next/server";
import { sseConnectionManager } from "../../../../features/sse/server/SSEConnectionManager";

interface SendEventPayload {
  clientId: string;
  event: string;
  data: object;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendEventPayload;

    // Validate required fields
    if (!body.clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: clientId",
        },
        { status: 400 },
      );
    }

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

    // Check if client has active connections
    const clientConnectionCount = sseConnectionManager.getClientConnectionCount(
      body.clientId,
    );
    if (clientConnectionCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No active connections found for client: ${body.clientId}`,
          clientId: body.clientId,
        },
        { status: 200 }, // Using 200 as this is not a client error, just no recipients
      );
    }

    // Send event to the specific client
    sseConnectionManager.sendEvent(body.clientId, body.event, body.data);

    return NextResponse.json({
      success: true,
      message: "Event sent successfully",
      clientId: body.clientId,
      event: body.event,
      connectionCount: clientConnectionCount,
    });
  } catch (error) {
    console.error("[API] Error in /api/sse/send:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while sending event",
      },
      { status: 500 },
    );
  }
}
