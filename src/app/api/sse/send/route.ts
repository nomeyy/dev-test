/**
 * SSE Send API Endpoint
 *
 * This endpoint provides a clean interface for backend modules to send
 * events to SSE clients. It uses the centralized SSE service.
 */

import { NextRequest, NextResponse } from "next/server";
import { sseService } from "@/lib/sse/sse-service";
import { sseLogger } from "@/lib/sse/logger";

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

    // Validate request
    if (!event || !event.type) {
      sseLogger.warn(
        "SSE Send API",
        "Invalid request: missing event or event type",
        {
          target,
          targetId: targetId || "none",
        },
      );
      return NextResponse.json(
        { error: "Event and event type are required" },
        { status: 400 },
      );
    }

    let sentCount = 0;

    // Send event based on target
    switch (target) {
      case "client":
        if (!targetId) {
          sseLogger.warn("SSE Send API", "Client target requires targetId", {
            target,
            eventType: event.type,
          });
          return NextResponse.json(
            { error: "targetId is required for client target" },
            { status: 400 },
          );
        }
        sentCount = sseService.sendToClient(targetId, event) ? 1 : 0;
        break;

      case "user":
        if (!targetId) {
          sseLogger.warn("SSE Send API", "User target requires targetId", {
            target,
            eventType: event.type,
          });
          return NextResponse.json(
            { error: "targetId is required for user target" },
            { status: 400 },
          );
        }
        sentCount = sseService.sendToUser(targetId, event);
        break;

      case "session":
        if (!targetId) {
          sseLogger.warn("SSE Send API", "Session target requires targetId", {
            target,
            eventType: event.type,
          });
          return NextResponse.json(
            { error: "targetId is required for session target" },
            { status: 400 },
          );
        }
        sentCount = sseService.sendToSession(targetId, event);
        break;

      case "broadcast":
      case "all":
        sentCount = sseService.broadcast(event);
        break;

      default:
        sseLogger.warn("SSE Send API", "Invalid target specified", {
          target,
          eventType: event.type,
          validTargets: ["client", "user", "session", "broadcast", "all"],
        });
        return NextResponse.json(
          {
            error:
              "Invalid target. Use: client, user, session, broadcast, or all",
          },
          { status: 400 },
        );
    }

    const stats = sseService.getStats();

    sseLogger.info("SSE Send API", "Event sent successfully", {
      target,
      targetId: targetId || "none",
      eventType: event.type,
      sentCount,
      totalClients: stats.totalClients,
    });

    return NextResponse.json({
      success: true,
      sentCount,
      target,
      targetId,
      event,
      stats,
    });
  } catch (error) {
    sseLogger.error(
      "SSE Send API",
      "Internal server error",
      {},
      error as Error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
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
