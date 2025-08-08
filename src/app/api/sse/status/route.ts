/**
 * SSE Status Endpoint
 *
 * GET /api/sse/status - Get detailed SSE service status
 */

import { getSSEService } from "@/lib/sse";
import { createSuccessResponse, createErrorResponse } from "../utils";

// Get SSE service instance
const sseService = getSSEService();

export async function GET() {
  try {
    // Get detailed report
    const report = sseService.getDetailedReport();

    console.info("Status report requested");

    return createSuccessResponse(report);
  } catch (error) {
    console.error("Failed to get status:", error);
    return createErrorResponse(
      "Failed to retrieve status",
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
