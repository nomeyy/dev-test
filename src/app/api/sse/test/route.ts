import { NextRequest } from "next/server";
import { SSEUtils } from "@/lib/sse/sse-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return new Response("Missing userId or message", { status: 400 });
    }

    // Send test notification to specific user
    const sentCount = SSEUtils.notifyUser(userId, "test_message", {
      message,
      timestamp: Date.now(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        message: "Test message sent successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Test message error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
