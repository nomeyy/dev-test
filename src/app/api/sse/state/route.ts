import { sseManager } from "@/lib/sse/server";

export async function GET() {
  try {
    const stats = sseManager.getStats();
    const connectedClients = sseManager.getConnectedClients();

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats,
        connectedClients: connectedClients.map((client) => ({
          id: client.id,
          userId: client.userId,
          sessionId: client.sessionId,
          isConnected: client.isConnected,
          lastPing: client.lastPing,
        })),
        totalClientsInMap: Array.from(sseManager["clients"].keys()),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SSE State: Error getting state:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
