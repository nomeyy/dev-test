import { NextRequest, NextResponse } from "next/server";
import {
  broadcast,
  sendToRoom,
  sendToSocket,
  sendToUser,
  sendToUsers,
  getSocketStats,
} from "@/lib/socket/utils";
import { logger } from "@/utils/logging";

export async function GET() {
  try {
    const stats = getSocketStats();
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("socket-route", "Failed to get socket stats", error);
    return NextResponse.json(
      { success: false, error: "Failed to get socket stats" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, type, data, target, targetId, room, userIds } = body || {};

    if (!action || !type) {
      return NextResponse.json(
        { success: false, error: "Missing action or type" },
        { status: 400 },
      );
    }

    const notification = { type, data, timestamp: new Date() } as const;

    switch (action) {
      case "broadcast":
        broadcast(notification);
        return NextResponse.json({ success: true, action });

      case "sendToSocket":
        if (!targetId)
          return NextResponse.json(
            { success: false, error: "targetId required" },
            { status: 400 },
          );
        sendToSocket(targetId, notification);
        return NextResponse.json({ success: true, action });

      case "sendToUser":
        if (!targetId)
          return NextResponse.json(
            { success: false, error: "targetId required" },
            { status: 400 },
          );
        const ok = sendToUser(targetId, notification);
        return NextResponse.json({ success: ok, action });

      case "sendToUsers":
        if (!Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json(
            { success: false, error: "userIds array required" },
            { status: 400 },
          );
        }
        sendToUsers(userIds, notification);
        return NextResponse.json({ success: true, action });

      case "sendToRoom":
        if (!room)
          return NextResponse.json(
            { success: false, error: "room required" },
            { status: 400 },
          );
        sendToRoom(room, notification);
        return NextResponse.json({ success: true, action });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("socket-route", "Failed to process socket POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}
