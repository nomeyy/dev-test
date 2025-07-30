import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSSEManager } from "@/features/sse";

/**
 * Example webhook handler that demonstrates server-side SSE usage
 * POST /api/webhooks/example
 *
 * This simulates a webhook from an external service (payment processor,
 * order management system, etc.) that needs to notify users in real-time.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId: string;
      eventType: string;
      data: Record<string, unknown>;
    };

    const { userId, eventType, data } = body;

    if (!userId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields: userId, eventType" },
        { status: 400 },
      );
    }

    // Get SSE manager instance
    const sseManager = getSSEManager();

    // Send real-time notification to the user
    const sentCount = sseManager.sendToUser(userId, {
      event: eventType,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        source: "webhook",
      },
      id: `webhook_${Date.now()}`,
    });

    console.log(
      `Webhook: Sent ${eventType} event to user ${userId} (${sentCount} clients)`,
    );

    return NextResponse.json({
      success: true,
      sentCount,
      message: `Event sent to ${sentCount} client(s)`,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
