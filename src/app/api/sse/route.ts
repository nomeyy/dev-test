import type { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { sseManager } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSERoute");

/**
 * SSE endpoint handler
 * GET /api/sse - Establish SSE connection
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session for authenticated connections
    const session = await getSession();
    const userId = session?.user?.id;

    // Extract connection options from URL parameters
    const url = new URL(request.url);
    const heartbeatInterval = url.searchParams.get("heartbeat")
      ? parseInt(url.searchParams.get("heartbeat")!)
      : undefined;

    // Create metadata from request headers and params
    const metadata = {
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      ip:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip"),
      timestamp: new Date().toISOString(),
    };

    log.info("Creating SSE connection", {
      userId,
      metadata,
      heartbeatInterval,
    });

    // Create SSE connection
    const response = sseManager.createConnection({
      userId,
      metadata,
      heartbeatInterval,
    });

    return response;
  } catch (error) {
    handleError("establishing SSE connection", error);

    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
