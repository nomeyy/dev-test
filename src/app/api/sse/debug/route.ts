import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/server";

export async function GET() {
  try {
    const stats = sseManager.getStats();
    const connectedClients = sseManager.getConnectedClients();

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        connectedClients: connectedClients.map((client) => ({
          id: client.id,
          userId: client.userId,
          sessionId: client.sessionId,
          isConnected: client.isConnected,
          lastPing: client.lastPing,
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SSE Debug: Error getting debug info:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetType, targetId, message } = body;

    if (action === "send-test") {
      const testData = {
        message: message || "Debug test message",
        timestamp: new Date().toISOString(),
        debug: true,
      };

      let sentCount = 0;

      if (targetType === "user" && targetId) {
        sentCount = sseManager.sendToUser(targetId, "debug-test", testData);
      } else if (targetType === "client" && targetId) {
        const success = sseManager.sendToClient(
          targetId,
          "debug-test",
          testData,
        );
        sentCount = success ? 1 : 0;
      } else {
        sentCount = sseManager.broadcast("debug-test", testData);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Debug test sent to ${sentCount} client(s)`,
          sentCount,
          data: testData,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("SSE Debug: Error in debug action:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
