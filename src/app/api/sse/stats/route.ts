import type { NextRequest } from "next/server";
import { getStats } from "@/lib/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSE-Stats");

export async function GET(_request: NextRequest) {
  try {
    const stats = getStats();

    log.info("SSE stats requested", { stats });

    const response = {
      success: true,
      message: "SSE statistics retrieved successfully",
      data: {
        ...stats,
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
