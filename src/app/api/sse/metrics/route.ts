/**
 * SSE Metrics Endpoint
 *
 * GET /api/sse/metrics - Get current SSE service metrics
 */

import { getSSEService } from "@/lib/sse";
import { createSuccessResponse, createErrorResponse } from "../utils";

// Get SSE service instance
const sseService = getSSEService();

export async function GET() {
  try {
    // Get current metrics
    const metrics = sseService.getMetrics();
    const status = sseService.getStatus();
    const health = sseService.getHealth();

    // Transform metrics for frontend
    const transformedMetrics = {
      connections: {
        active: metrics.connections.active,
        total: metrics.connections.total,
        byUser: metrics.connections.byUser.size,
        bySession: metrics.connections.bySession.size,
      },
      events: {
        sent: metrics.events.sent,
        received: 0, // Not tracked in backend, placeholder for frontend
        failed: metrics.events.failed,
        rate: metrics.events.rate,
      },
      performance: {
        memoryUsageMB: metrics.performance.memoryUsageMB,
        uptime: metrics.performance.uptime,
        averageLatency: metrics.performance.avgEventDeliveryMs, // Use correct property name
      },
    };

    console.info("Metrics requested", {
      activeConnections: metrics.connections.active,
      health,
    });

    return createSuccessResponse({
      metrics: transformedMetrics,
      status: {
        initialized: status.initialized,
        shuttingDown: status.shuttingDown,
        health,
      },
    });
  } catch (error) {
    console.error("Failed to get metrics:", error);
    return createErrorResponse(
      "Failed to retrieve metrics",
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
