import type { NextRequest } from "next/server";
import { getStats, sseManager } from "@/lib/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSE-Stats");

export async function GET(_request: NextRequest) {
  try {
    const stats = getStats();
    const activeConnections = sseManager.getActiveConnections();

    // Extract all connected userIds
    const connectedUserIds = Array.from(activeConnections.keys());

    log.info("SSE stats requested", { stats, connectedUserIds });

    const response = {
      success: true,
      message: "SSE statistics retrieved successfully",
      data: {
        ...stats,
        connectedUserIds,
        connections: Object.fromEntries(
          Array.from(activeConnections.entries()).map(([userId, clients]) => [
            userId,
            clients.map((client) => ({
              clientId: client.clientId,
              connectedAt: client.connectedAt,
              lastActivity: client.lastActivity,
            })),
          ]),
        ),
        serverInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
        },
      },
      timestamp: new Date().toISOString(),
      requestId: `stats-${Date.now()}`,
    };

    return Response.json(response);
  } catch (error) {
    return handleError("getting SSE stats", error);
  }
}
