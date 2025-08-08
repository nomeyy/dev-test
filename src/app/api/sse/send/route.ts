import type { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { sseService, sseManager } from "@/lib/sse";
import { createServiceContext } from "@/utils/service-utils";
import { z } from "zod";

const { log, handleError } = createServiceContext("SSE-Send");

// Validation schemas for different event types
const SendNotificationSchema = z.object({
  type: z.literal("notification"),
  userId: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const SendCustomEventSchema = z.object({
  type: z.literal("custom"),
  userId: z.string(),
  eventType: z.string(),
  data: z.record(z.unknown()),
});

const BroadcastNotificationSchema = z.object({
  type: z.literal("broadcast"),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const SendErrorSchema = z.object({
  type: z.literal("error"),
  userId: z.string(),
  errorMessage: z.string(),
  context: z.string().optional(),
});

const SendSuccessSchema = z.object({
  type: z.literal("success"),
  userId: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
});

const SendMaintenanceSchema = z.object({
  type: z.literal("maintenance"),
  message: z.string(),
  estimatedDuration: z.string().optional(),
});

// Union schema for all event types
const SendEventSchema = z.discriminatedUnion("type", [
  SendNotificationSchema,
  SendCustomEventSchema,
  BroadcastNotificationSchema,
  SendErrorSchema,
  SendSuccessSchema,
  SendMaintenanceSchema,
]);

export async function POST(request: NextRequest) {
  try {
    // Get user session for authentication
    const session = await getSession();

    const body = (await request.json()) as unknown;
    const validatedData = SendEventSchema.parse(body);

    // For testing purposes, allow requests without session
    let userId: string;
    if (!session?.user?.id) {
      // Use userId from request body if available, otherwise default
      if ("userId" in validatedData) {
        userId = validatedData.userId;
      } else {
        userId = "test-user-123";
      }
      log.info("Using userId from request body or default", { userId });
    } else {
      userId = session.user.id;
    }

    log.info("SSE event send request", {
      userId: userId,
      eventType: validatedData.type,
    });

    // Route to appropriate service method based on event type
    const eventDetails: {
      type: string;
      target: string;
      recipients?: number;
      message?: string;
      eventId: string;
    } = {
      type: validatedData.type,
      target:
        validatedData.type === "broadcast" ||
        validatedData.type === "maintenance"
          ? "all users"
          : `user: ${"userId" in validatedData ? validatedData.userId : userId}`,
      eventId: `${validatedData.type}-${Date.now()}`,
    };

    switch (validatedData.type) {
      case "notification":
        await sseService.sendNotification(
          validatedData.userId,
          validatedData.message,
          validatedData.metadata,
        );
        eventDetails.message = validatedData.message;
        break;

      case "custom":
        await sseService.sendCustomEvent(
          validatedData.userId,
          validatedData.eventType,
          validatedData.data,
        );
        eventDetails.message = `Custom event '${validatedData.eventType}' sent`;
        break;

      case "broadcast":
        await sseService.broadcastNotification(
          validatedData.message,
          validatedData.metadata,
        );
        eventDetails.message = validatedData.message;
        eventDetails.recipients = sseManager.getConnectionCount();
        break;

      case "error":
        await sseService.sendCustomEvent(validatedData.userId, "error", {
          message: validatedData.errorMessage,
          context: validatedData.context,
        });
        eventDetails.message = `Error: ${validatedData.errorMessage}`;
        break;

      case "success":
        await sseService.sendNotification(
          validatedData.userId,
          validatedData.message,
          validatedData.data,
        );
        eventDetails.message = validatedData.message;
        break;

      case "maintenance":
        await sseService.broadcastNotification(validatedData.message, {
          estimatedDuration: validatedData.estimatedDuration,
        });
        eventDetails.message = validatedData.message;
        eventDetails.recipients = sseManager.getConnectionCount();
        break;

      default:
        throw new Error(
          `Unknown event type: ${(validatedData as { type: string }).type}`,
        );
    }

    const response = {
      success: true,
      message: `${eventDetails.type} event sent successfully`,
      details: eventDetails,
      timestamp: new Date().toISOString(),
    };

    return Response.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return handleError("sending SSE event", error);
  }
}
