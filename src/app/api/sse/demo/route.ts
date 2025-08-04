import { NextRequest } from "next/server";
import {
  broadcast,
  notifyUser,
  systemNotification,
  realtimeUpdate,
  progressUpdate,
  successNotification,
  errorNotification,
} from "@/features/sse";
import { logger } from "@/utils/logging";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { type, userId, message, data, operationId, progress } = body;

    let result = 0;

    switch (type) {
      case "broadcast":
        result = broadcast({
          event: "demo",
          data: {
            message: message || "Demo broadcast message",
            timestamp: new Date().toISOString(),
          },
        });
        break;

      case "user":
        if (!userId) {
          return new Response("userId is required for user notifications", {
            status: 400,
          });
        }
        result = notifyUser(userId, {
          event: "demo",
          data: {
            message: message || `Demo message for user ${userId}`,
            timestamp: new Date().toISOString(),
          },
        });
        break;

      case "system":
        result = systemNotification(
          message || "Demo system notification",
          "info",
        );
        break;

      case "update":
        result = realtimeUpdate(
          "demo",
          data || { message: "Demo update" },
          userId ? [userId] : undefined,
        );
        break;

      case "progress":
        if (!operationId) {
          return new Response("operationId is required for progress updates", {
            status: 400,
          });
        }
        result = progressUpdate(operationId, progress || 50, message, userId);
        break;

      case "success":
        result = successNotification(
          message || "Demo success notification",
          data,
          userId,
        );
        break;

      case "error":
        result = errorNotification(
          message || "Demo error notification",
          data,
          userId,
        );
        break;

      default:
        return new Response("Invalid notification type", { status: 400 });
    }

    logger.info("SSE", "Demo notification sent", { type, userId, result });

    return new Response(
      JSON.stringify({
        success: true,
        clientsNotified: result,
        type,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    logger.error("SSE", "Failed to send demo notification", error);

    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
