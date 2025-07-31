/**
 * SSE Send API Endpoint
 *
 * This endpoint provides a clean interface for backend modules to send
 * events to SSE clients. It uses the centralized SSE service.
 */

import { NextRequest } from "next/server";
import { sseService } from "@/lib/sse";
import { sseLogger } from "@/lib/sse/logger";
import {
  createErrorResponse,
  createSuccessResponse,
  validateSendTarget,
  NextResponse,
} from "../utils";

interface SendEventRequest {
  target: "client" | "user" | "session" | "broadcast" | "all";
  targetId?: string;
  event: {
    type: string;
    data: unknown;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEventRequest = await request.json();
    const { target, targetId, event } = body;

    sseLogger.info("SSE Send API", "Received event send request", {
      target,
      targetId: targetId || "none",
      eventType: event.type,
    });

    // Validate event
    if (!event?.type) {
      return createErrorResponse(
        "Event and event type are required",
        400,
        "SSE Send API",
      );
    }

    // Validate target and targetId
    const validation = validateSendTarget(target, targetId);
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, 400, "SSE Send API");
    }

    // Send event based on target
    let sentCount = 0;
    switch (target) {
      case "client":
        sentCount = sseService.sendToClient(targetId!, event) ? 1 : 0;
        break;
      case "user":
        sentCount = sseService.sendToUser(targetId!, event);
        break;
      case "session":
        sentCount = sseService.sendToSession(targetId!, event);
        break;
      case "broadcast":
      case "all":
        sentCount = sseService.broadcast(event);
        break;
    }

    const stats = sseService.getStats();

    return createSuccessResponse(
      {
        sentCount,
        target,
        targetId,
        event,
        stats,
      },
      "SSE Send API",
      "Event sent successfully",
      {
        target,
        targetId: targetId || "none",
        eventType: event.type,
        sentCount,
        totalClients: stats.totalClients,
      },
    );
  } catch (error) {
    return createErrorResponse(
      "Internal server error",
      500,
      "SSE Send API",
      error as Error,
    );
  }
}

export async function GET() {
  try {
    sseLogger.debug("SSE Send API", "Stats request received");

    const stats = sseService.getStats();
    const clients = sseService.getClients();

    sseLogger.info("SSE Send API", "Stats retrieved successfully", {
      totalClients: stats.totalClients,
      totalUsers: stats.totalUsers,
      totalSessions: stats.totalSessions,
    });

    return NextResponse.json({
      success: true,
      stats,
      clients,
    });
  } catch (error) {
    sseLogger.error(
      "SSE Send API",
      "Error retrieving stats",
      {},
      error as Error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
