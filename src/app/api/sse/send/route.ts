import { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { getSSEManager } from "@/features/sse/services";
import type { SSEEvent, BroadcastSSEEvent } from "@/features/sse/types";

/**
 * SSE Event Sending endpoint
 * Allows sending events to specific users or broadcasting to all users
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session for authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as {
      type: string;
      data: Record<string, unknown>;
      targetUserId?: string;
      broadcast?: boolean;
      excludeUserIds?: string[];
    };

    const { type, data, targetUserId, broadcast, excludeUserIds } = body;

    if (!type || !data) {
      return new Response("Missing required fields: type and data", {
        status: 400,
      });
    }

    const sseManager = getSSEManager();
    const event: SSEEvent = {
      type: type as SSEEvent["type"], // Type assertion needed for SSEEventType
      data,
      timestamp: new Date(),
    };

    if (broadcast) {
      // Broadcast to all users
      const broadcastEvent: BroadcastSSEEvent = {
        ...event,
        excludeUserIds: excludeUserIds ?? [],
      };

      console.log("Broadcasting to all users", event);
      await sseManager.broadcast(broadcastEvent);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Event broadcasted to all users",
          eventType: type,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else if (targetUserId) {
      // Send to specific user
      await sseManager.sendToUser(targetUserId, event);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Event sent to user ${targetUserId}`,
          eventType: type,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(
        "Either 'broadcast' or 'targetUserId' must be specified",
        {
          status: 400,
        },
      );
    }
  } catch (error) {
    console.error("SSE send error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
