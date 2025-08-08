import type { NextRequest } from "next/server";
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
    const body = (await request.json()) as unknown;
    const validatedData = SendEventSchema.parse(body);

    // Get userId from request body or use default for broadcast/maintenance
    const userId =
      "userId" in validatedData ? validatedData.userId : "test-user-123";

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
        // Check if user has active connections
        const userConnections = sseManager
          .getActiveConnections()
          .get(validatedData.userId);
        if (!userConnections || userConnections.length === 0) {
          return Response.json(
            {
              success: false,
              message: "User is not connected",
              userId: validatedData.userId,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        await sseService.sendNotification(
          validatedData.userId,
          validatedData.message,
          validatedData.metadata,
        );
        eventDetails.message = validatedData.message;
        eventDetails.recipients = userConnections.length;
        break;

      case "custom":
        // Check if user has active connections
        const customUserConnections = sseManager
          .getActiveConnections()
          .get(validatedData.userId);
        if (!customUserConnections || customUserConnections.length === 0) {
          return Response.json(
            {
              success: false,
              message: "User is not connected",
              userId: validatedData.userId,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        await sseService.sendCustomEvent(
          validatedData.userId,
          validatedData.eventType,
          validatedData.data,
        );
        eventDetails.message = `Custom event '${validatedData.eventType}' sent`;
        eventDetails.recipients = customUserConnections.length;
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
        // Check if user has active connections
        const errorUserConnections = sseManager
          .getActiveConnections()
          .get(validatedData.userId);
        if (!errorUserConnections || errorUserConnections.length === 0) {
          return Response.json(
            {
              success: false,
              message: "User is not connected",
              userId: validatedData.userId,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        await sseService.sendCustomEvent(validatedData.userId, "error", {
          message: validatedData.errorMessage,
          context: validatedData.context,
        });
        eventDetails.message = `Error: ${validatedData.errorMessage}`;
        eventDetails.recipients = errorUserConnections.length;
        break;

      case "success":
        // Check if user has active connections
        const successUserConnections = sseManager
          .getActiveConnections()
          .get(validatedData.userId);
        if (!successUserConnections || successUserConnections.length === 0) {
          return Response.json(
            {
              success: false,
              message: "User is not connected",
              userId: validatedData.userId,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        await sseService.sendNotification(
          validatedData.userId,
          validatedData.message,
          validatedData.data,
        );
        eventDetails.message = validatedData.message;
        eventDetails.recipients = successUserConnections.length;
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
