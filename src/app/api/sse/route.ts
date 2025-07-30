/**
 * SSE API Endpoint
 *
 * This endpoint provides the main SSE connection interface for clients.
 * It uses the centralized SSE service for all connection management.
 */

import { NextRequest } from "next/server";
import { sseService } from "@/lib/sse/sse-service";
import { sseLogger } from "@/lib/sse/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const metadata = {
      userAgent: request.headers.get("user-agent") || "unknown",
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    };

    sseLogger.info("SSE API", "New connection request", {
      userId: userId || "anonymous",
      sessionId: sessionId || "none",
      userAgent: metadata.userAgent,
      ip: metadata.ip,
    });

    // Create connection using centralized service
    const { clientId, stream } = sseService.createConnection({
      userId,
      sessionId,
      metadata,
    });

    sseLogger.info("SSE API", "Connection established", {
      clientId,
      userId: userId || "anonymous",
      sessionId: sessionId || "none",
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "Access-Control-Allow-Methods": "GET",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    sseLogger.error(
      "SSE API",
      "Failed to create connection",
      {},
      error as Error,
    );

    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
