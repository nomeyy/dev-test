import type { NextRequest } from "next/server";
import { getSSEManager } from "@/features/sse";
import { getSession } from "@/features/auth";

/**
 * SSE endpoint for client connections
 * GET /api/sse
 */
export async function GET(request: NextRequest) {
  try {
    // Get optional user session for authenticated connections
    const session = await getSession();
    const userId = session?.user?.id;

    // Extract additional connection parameters from URL
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? undefined;
    const clientMetadata = searchParams.get("metadata");

    let metadata: Record<string, unknown> | undefined;
    if (clientMetadata) {
      try {
        metadata = JSON.parse(clientMetadata) as Record<string, unknown>;
      } catch {
        // Invalid JSON, ignore metadata
        metadata = undefined;
      }
    }

    // Get SSE manager instance
    const sseManager = getSSEManager({
      debug: process.env.NODE_ENV === "development",
      heartbeatInterval: 30000, // 30 seconds
      cleanupInterval: 60000, // 1 minute
      maxIdleTime: 300000, // 5 minutes
      maxClientsPerUser: 5,
    });

    // Create SSE connection
    const response = sseManager.createConnection({
      userId,
      sessionId,
      metadata,
    });

    return response;
  } catch (error) {
    console.error("SSE endpoint error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
