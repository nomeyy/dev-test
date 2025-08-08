/**
 * SSE Heartbeat/Ping Endpoint
 *
 * POST /api/sse/heartbeat - Handle client ping
 * GET /api/sse/heartbeat - Get heartbeat configuration
 */

import { type NextRequest } from "next/server";
import { getSSEService, SSEErrorCode } from "@/lib/sse";
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
  PingRequestSchema,
} from "../utils";

// Get SSE service instance
const sseService = getSSEService();

/**
 * Handle client ping
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, PingRequestSchema);

    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const { clientId } = validation.data;

    // Handle the ping
    const result = sseService.handlePing(clientId);

    if (!result.success) {
      return createErrorResponse(
        result.error.message,
        result.error.code === SSEErrorCode.CLIENT_NOT_FOUND ? 404 : 500,
        result.error.details,
      );
    }

    return createSuccessResponse({
      clientId,
      timestamp: Date.now(),
      message: "Pong",
    });
  } catch (error) {
    console.error("Failed to handle ping:", error);
    return createErrorResponse(
      "Failed to handle ping",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * Get heartbeat configuration and stats
 */
export async function GET() {
  try {
    const status = sseService.getStatus();
    const healthStats = status.metrics.health;

    return createSuccessResponse({
      config: status.config.health,
      stats: {
        totalHeartbeatsSent: healthStats.totalHeartbeatsSent,
        totalHeartbeatsReceived: healthStats.totalHeartbeatsReceived,
        clientTimeouts: healthStats.clientTimeouts,
        lastHeartbeat: healthStats.lastHeartbeat,
        unhealthyConnections: healthStats.unhealthyConnections,
      },
    });
  } catch (error) {
    console.error("Failed to get heartbeat info:", error);
    return createErrorResponse(
      "Failed to retrieve heartbeat information",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
