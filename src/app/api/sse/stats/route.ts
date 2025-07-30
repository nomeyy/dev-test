import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/server";

export async function GET(request: NextRequest) {
  try {
    const stats = sseManager.getStats();
    const connectedClients = sseManager.getConnectedClients();

    return new Response(
      JSON.stringify({
        stats,
        connectedClients: connectedClients.map((client) => ({
          id: client.id,
          userId: client.userId,
          sessionId: client.sessionId,
          lastPing: client.lastPing,
          isConnected: client.isConnected,
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SSE Stats: Error getting stats:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
