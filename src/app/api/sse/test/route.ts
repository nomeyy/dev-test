import { NextRequest } from "next/server";
import { sendSSEMessage, broadcastSSE } from "@/lib/sse/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, target = "all", targetId } = body;

    if (!event || !data) {
      return new Response("Missing event or data", { status: 400 });
    }

    let sentCount = 0;

    if (target === "all") {
      // Broadcast to all clients
      sentCount = broadcastSSE(event, data);
    } else {
      // Send to specific target
      sentCount = sendSSEMessage({
        event,
        data,
        target: target as "user" | "session" | "client",
        targetId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Event '${event}' sent to ${sentCount} client(s)`,
        sentCount,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SSE Test: Error sending message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    // Send a test broadcast message
    const testData = {
      message: "Test broadcast message",
      timestamp: new Date().toISOString(),
      random: Math.random(),
    };

    const sentCount = broadcastSSE("test-broadcast", testData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test broadcast sent to ${sentCount} client(s)`,
        sentCount,
        data: testData,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SSE Test: Error sending test broadcast:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
