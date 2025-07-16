import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sseService } from "@/features/sse";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("SSE-Test-API");

const TestEventSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(["notification", "alert", "update", "system"]),
  message: z.string(),
  data: z.record(z.any()).optional(),
});

/**
 * Test endpoint for SSE functionality
 * Allows testing of different event types
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, message, data } = TestEventSchema.parse(body);

    log.info("Sending test SSE event", { userId, type, message });

    let result: boolean | number;

    switch (type) {
      case "notification":
        if (!userId) {
          throw new Error("User ID is required for notifications");
        }
        result = await sseService.sendNotification(userId, {
          type: "notification",
          message,
          data,
          priority: "medium",
        });
        break;

      case "alert":
        if (!userId) {
          throw new Error("User ID is required for alerts");
        }
        result = await sseService.sendAlert(userId, message, data);
        break;

      case "update":
        if (!userId) {
          throw new Error("User ID is required for updates");
        }
        result = await sseService.sendUpdate(userId, message, data);
        break;

      case "system":
        result = await sseService.sendSystemMessage(message, data);
        break;

      default:
        throw new Error(`Unsupported event type: ${type}`);
    }

    return NextResponse.json({
      success: true,
      result,
      event: { type, message, data },
    });
  } catch (error) {
    log.error("Test SSE event error", { error });
    return handleError("Test SSE event", error);
  }
}

/**
 * Get connection statistics
 */
export async function GET() {
  try {
    const stats = sseService.getConnectionStats();
    const activeCount = sseService.getActiveConnectionCount();
    const activeClients = sseService.getActiveClients();

    return NextResponse.json({
      success: true,
      stats,
      activeCount,
      clients: activeClients.map((client) => ({
        id: client.id,
        userId: client.userId,
        sessionId: client.sessionId,
        connectedAt: client.connectedAt,
        lastPing: client.lastPing,
        metadata: client.metadata,
      })),
    });
  } catch (error) {
    log.error("Get SSE stats error", { error });
    return handleError("Get SSE stats", error);
  }
}
