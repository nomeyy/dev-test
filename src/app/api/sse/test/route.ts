import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/SSEManager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, event, payload } = body;

    switch (action) {
      case "sendToUser":
        if (!userId || !event || !payload) {
          return new Response(
            JSON.stringify({
              error:
                "userId, event, and payload are required for sendToUser action",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        sseManager.sendToUser(userId, event, payload);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Sent '${event}' to user ${userId}`,
            clientCount: sseManager.getClientCount(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

      case "broadcast":
        if (!event || !payload) {
          return new Response(
            JSON.stringify({
              error: "event and payload are required for broadcast action",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        sseManager.broadcast(event, payload);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Broadcasted '${event}' to all clients`,
            clientCount: sseManager.getClientCount(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

      case "getStatus":
        return new Response(
          JSON.stringify({
            success: true,
            clientCount: sseManager.getClientCount(),
            connectedUsers: sseManager.getConnectedUsers(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

      default:
        return new Response(
          JSON.stringify({
            error: "Invalid action. Use: sendToUser, broadcast, or getStatus",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
    }
  } catch (error) {
    console.error("[SSE Test] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
