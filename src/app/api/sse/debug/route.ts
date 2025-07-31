import { sseManager } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEDebug");

/**
 * Debug endpoint to check SSE connection status
 * GET /api/sse/debug
 */
export async function GET() {
  try {
    const stats = sseManager.getStats();
    const clients = sseManager.getClients();

    log.info("SSE Debug info requested", stats);

    return Response.json({
      stats,
      clients: clients.map((client) => ({
        id: client.id,
        userId: client.userId,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to get SSE debug info", error);

    return Response.json(
      {
        error: "Failed to get debug info",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
