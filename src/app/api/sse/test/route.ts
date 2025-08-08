import { type NextRequest } from "next/server";
import { SSE } from "@/lib/sse";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, userId, sessionId, clientId, broadcast } = body;

    if (!event || !data) {
      return new Response("Missing required fields: event and data", {
        status: 400,
      });
    }

    let sentCount = 0;

    if (broadcast) {
      // Send to all connected clients
      sentCount = SSE.broadcast(event, data);
    } else if (clientId) {
      // Send to specific client
      const success = SSE.toClient(clientId, event, data);
      sentCount = success ? 1 : 0;
    } else if (userId) {
      // Send to specific user
      sentCount = SSE.toUser(userId, event, data);
    } else if (sessionId) {
      // Send to specific session
      sentCount = SSE.toSession(sessionId, event, data);
    } else {
      // Default to broadcast if no targeting specified
      sentCount = SSE.broadcast(event, data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Event "${event}" sent to ${sentCount} client(s)`,
        sentCount,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SSE Test API Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
