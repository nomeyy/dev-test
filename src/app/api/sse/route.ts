import { NextRequest } from "next/server";
import { getSSEManager } from "@/features/sse";
import { logger } from "@/utils/logging";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;

    // Parse metadata from query parameters
    const metadata: Record<string, unknown> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== "userId" && key !== "sessionId") {
        metadata[key] = value;
      }
    }

    const sseManager = getSSEManager();
    const response = sseManager.createConnection({
      userId,
      sessionId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    logger.info("SSE", "New connection request", {
      userId,
      sessionId,
      metadata,
    });

    return response;
  } catch (error) {
    logger.error("SSE", "Failed to create SSE connection", error);

    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
