import { NextRequest } from "next/server";
import { SSEUtils } from "@/lib/sse/sse-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return new Response("Missing message", { status: 400 });
    }

    // Broadcast message to all connected clients
    const sentCount = SSEUtils.broadcast("broadcast_message", {
      message,
      timestamp: Date.now(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        message: "Broadcast message sent successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Broadcast error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
