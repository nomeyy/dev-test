import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendNotification, broadcastMessage } from "@/features/sse";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Example: Send a notification when a webhook is received
    await sendNotification(
      "Webhook Received",
      `Received webhook with data: ${JSON.stringify(body)}`,
      "info",
    );

    // Example: Broadcast a custom event
    await broadcastMessage("webhook-event", {
      type: "webhook",
      data: body as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed and SSE notifications sent",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
