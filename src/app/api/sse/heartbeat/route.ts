import { NextRequest, NextResponse } from "next/server";
import { sseConnectionManager } from "@/lib/sse/connection-manager";

/**
 * API endpoint for handling heartbeat responses from SSE clients
 * Clients can ping this endpoint to confirm they're still alive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      );
    }

    const updated = sseConnectionManager.updateClientPing(clientId);

    if (!updated) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      clientId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SSE Heartbeat API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to retrieve heartbeat configuration
 */
export async function GET() {
  try {
    const config = sseConnectionManager.getHeartbeatConfig();
    const stats = sseConnectionManager.getStats();

    return NextResponse.json({
      success: true,
      heartbeat: config,
      stats,
    });
  } catch (error) {
    console.error("SSE Heartbeat Config API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
