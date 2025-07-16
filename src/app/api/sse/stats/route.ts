import { getSSEStats } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEStatsEndpoint");

/**
 * SSE Statistics endpoint
 * Provides connection statistics for monitoring
 */
export async function GET() {
  try {
    const stats = getSSEStats();

    log.info("SSE stats requested", stats);

    return Response.json(stats);
  } catch (error) {
    log.error("Failed to get SSE stats", error);
    return Response.json(
      { error: "Failed to retrieve SSE statistics" },
      { status: 500 },
    );
  }
}
