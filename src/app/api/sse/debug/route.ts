import { sseService } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEDebugEndpoint");

/**
 * SSE Debug endpoint for checking connection status
 */
export async function GET() {
  try {
    const stats = sseService.getStats();
    const connections = sseService.getConnections();

    log.info("SSE Debug info", { stats, connections });

    return Response.json({
      success: true,
      stats,
      connections: connections.map((conn) => ({
        id: conn.id,
        userId: conn.userId,
        sessionId: conn.sessionId,
        isAlive: conn.isAlive,
        lastActivity: conn.lastActivity,
        hasSendEvent: !!conn.sendEvent,
      })),
    });
  } catch (error) {
    log.error("SSE Debug failed", error);
    return Response.json(
      { error: "Failed to get SSE debug info" },
      { status: 500 },
    );
  }
}
