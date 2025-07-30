import {
  initializeSSE,
  getSSEStats,
} from "../../../../features/sse/services/sse-service";
import { logger } from "@/utils/logging";

const sseLogger = logger.createContextLogger("SSE");

// Initialize SSE manager on module load
initializeSSE();

export async function GET() {
  try {
    const stats = getSSEStats();

    return Response.json(stats);
  } catch (error) {
    sseLogger.error("Error fetching stats", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
