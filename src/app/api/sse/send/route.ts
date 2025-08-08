/**
 * SSE Send Event Endpoint
 *
 * POST /api/sse/send - Send events to connected clients
 */

import { type NextRequest } from "next/server";
import { getSSEService, SSEErrorCode } from "@/lib/sse";
import type { EventTarget } from "@/lib/sse";
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
  SendEventRequestSchema,
} from "../utils";

// Get SSE service instance
const sseService = getSSEService();

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(
      request,
      SendEventRequestSchema,
    );

    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const { target, targetId, event } = validation.data;

    // Additional validation for targetId requirement
    if (target !== "broadcast" && target !== "all" && !targetId) {
      return createErrorResponse(
        `Target ID is required for target type: ${target}`,
        400,
      );
    }

    // Send the event
    const result = sseService.send({
      target: target as EventTarget,
      targetId,
      event: {
        type: event.type,
        data: event.data,
        id: event.id,
        retry: event.retry,
      },
    });

    if (!result.success) {
      return createErrorResponse(
        result.error.message,
        result.error.code === SSEErrorCode.CLIENT_NOT_FOUND ? 404 : 500,
        result.error.details,
      );
    }

    // Get current metrics for response
    const metrics = sseService.getMetrics();

    console.info("Event sent successfully", {
      target,
      targetId,
      eventType: event.type,
      sentCount: result.data.sentCount,
      failedCount: result.data.failedCount,
    });

    return createSuccessResponse({
      ...result.data,
      stats: {
        activeConnections: metrics.connections.active,
        totalConnections: metrics.connections.total,
        eventRate: metrics.events.rate,
      },
    });
  } catch (error) {
    console.error("Failed to send event:", error);
    return createErrorResponse(
      "Failed to send event",
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
