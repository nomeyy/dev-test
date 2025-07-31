import { sseManager } from "@/lib/sse";
import { logger } from "@/utils/logging";
import { SSE_CONFIG } from "@/lib/sse/constants";

export async function GET() {
  try {
    const stats = sseManager.getStats();
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(SSE_CONFIG.LOGGER.PREFIX, "Stats endpoint error", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
