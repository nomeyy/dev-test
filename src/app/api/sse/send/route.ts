import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  broadcastNotification,
  sendSystemNotification,
  notifyUser,
  notifySession,
} from "@/features/sse";

// Request validation schemas
const broadcastEventSchema = z.object({
  type: z.literal("broadcast"),
  eventType: z.string(),
  data: z.record(z.any()),
});

const systemEventSchema = z.object({
  type: z.literal("system"),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]).optional(),
});

const userEventSchema = z.object({
  type: z.literal("user"),
  userId: z.string(),
  eventType: z.string(),
  data: z.record(z.any()),
});

const sessionEventSchema = z.object({
  type: z.literal("session"),
  sessionId: z.string(),
  eventType: z.string(),
  data: z.record(z.any()),
});

const sendEventSchema = z.discriminatedUnion("type", [
  broadcastEventSchema,
  systemEventSchema,
  userEventSchema,
  sessionEventSchema,
]);

/**
 * Send SSE events to clients
 * POST /api/sse/send - Send events to connected clients
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendEventSchema.parse(body);

    let result: number;
    let message: string;

    switch (validatedData.type) {
      case "broadcast":
        result = broadcastNotification(
          validatedData.eventType,
          validatedData.data,
        );
        message = `Broadcasted event "${validatedData.eventType}" to ${result} clients`;
        break;

      case "system":
        result = sendSystemNotification(
          validatedData.message,
          validatedData.severity,
        );
        message = `Sent system notification to ${result} clients`;
        break;

      case "user":
        result = notifyUser(
          validatedData.userId,
          validatedData.eventType,
          validatedData.data,
        );
        message = `Sent event "${validatedData.eventType}" to user ${validatedData.userId}: ${result} connections`;
        break;

      case "session":
        result = notifySession(
          validatedData.sessionId,
          validatedData.eventType,
          validatedData.data,
        );
        message = `Sent event "${validatedData.eventType}" to session ${validatedData.sessionId}: ${result} connections`;
        break;

      default:
        throw new Error("Invalid event type");
    }

    return NextResponse.json({
      success: true,
      message,
      clientsNotified: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SSE send endpoint error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to send SSE event" },
      { status: 500 },
    );
  }
}
