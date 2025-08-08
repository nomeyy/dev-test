import type { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { getStats } from "@/lib/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSE-Stats");

export async function GET(_request: NextRequest) {
  try {
    // Get user session for authentication
    const session = await getSession();

    // For testing purposes, allow requests without session
    let userId: string;
    if (!session?.user?.id) {
      userId = "test-user-123";
      log.info("Using test userId for stats request", { userId });
    } else {
      userId = session.user.id;
    }

    const stats = getStats();

    log.info("SSE stats requested", {
      userId: userId,
      stats,
    });

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
