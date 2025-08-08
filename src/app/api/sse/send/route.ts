import type { NextRequest } from "next/server";
import { sseService, sseManager } from "@/lib/sse";
import { createServiceContext } from "@/utils/service-utils";
import { z } from "zod";

const { log, handleError } = createServiceContext("SSE-Send");

// Validation schemas for different event types
const SendNotificationSchema = z.object({
  type: z.literal("notification"),
  userIds: z.array(z.string()).min(1, "At least one userId must be provided"),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const SendCustomEventSchema = z.object({
  type: z.literal("custom"),
  userIds: z.array(z.string()).min(1, "At least one userId must be provided"),
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
  userIds: z.array(z.string()).min(1, "At least one userId must be provided"),
  errorMessage: z.string(),
  context: z.string().optional(),
});

const SendSuccessSchema = z.object({
  type: z.literal("success"),
  userIds: z.array(z.string()).min(1, "At least one userId must be provided"),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
});

const SendMaintenanceSchema = z.object({
  type: z.literal("maintenance"),
  message: z.string(),
  estimatedDuration: z.string().optional(),
});

// Union schema for all event types
const SendEventSchema = z.union([
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

    // Get target users (only for non-broadcast events)
    const targetUsers =
      validatedData.type === "broadcast" || validatedData.type === "maintenance"
        ? []
        : validatedData.userIds || ["test-user-123"];

    log.info("SSE event send request", {
      targetUsers,
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
          : targetUsers.length === 1
            ? `user: ${targetUsers[0]}`
            : `users: ${targetUsers.join(", ")}`,
      eventId: `${validatedData.type}-${Date.now()}`,
    };

    switch (validatedData.type) {
      case "notification":
        // Check if users have active connections
        let totalRecipients = 0;
        for (const userId of targetUsers) {
          const userConnections = sseManager.getActiveConnections().get(userId);
          if (userConnections && userConnections.length > 0) {
            totalRecipients += userConnections.length;
            await sseService.sendNotification(
              userId,
              validatedData.message,
              validatedData.metadata,
            );
          }
        }

        if (totalRecipients === 0) {
          return Response.json(
            {
              success: false,
              message: "No target users are connected",
              targetUsers,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        eventDetails.message = validatedData.message;
        eventDetails.recipients = totalRecipients;
        break;

      case "custom":
        // Check if users have active connections
        let customTotalRecipients = 0;
        for (const userId of targetUsers) {
          const userConnections = sseManager.getActiveConnections().get(userId);
          if (userConnections && userConnections.length > 0) {
            customTotalRecipients += userConnections.length;
            await sseService.sendCustomEvent(
              userId,
              validatedData.eventType,
              validatedData.data,
            );
          }
        }

        if (customTotalRecipients === 0) {
          return Response.json(
            {
              success: false,
              message: "No target users are connected",
              targetUsers,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        eventDetails.message = `Custom event '${validatedData.eventType}' sent`;
        eventDetails.recipients = customTotalRecipients;
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
        // Check if users have active connections
        let errorTotalRecipients = 0;
        for (const userId of targetUsers) {
          const userConnections = sseManager.getActiveConnections().get(userId);
          if (userConnections && userConnections.length > 0) {
            errorTotalRecipients += userConnections.length;
            await sseService.sendCustomEvent(userId, "error", {
              message: validatedData.errorMessage,
              context: validatedData.context,
            });
          }
        }

        if (errorTotalRecipients === 0) {
          return Response.json(
            {
              success: false,
              message: "No target users are connected",
              targetUsers,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        eventDetails.message = `Error: ${validatedData.errorMessage}`;
        eventDetails.recipients = errorTotalRecipients;
        break;

      case "success":
        // Check if users have active connections
        let successTotalRecipients = 0;
        for (const userId of targetUsers) {
          const userConnections = sseManager.getActiveConnections().get(userId);
          if (userConnections && userConnections.length > 0) {
            successTotalRecipients += userConnections.length;
            await sseService.sendNotification(
              userId,
              validatedData.message,
              validatedData.data,
            );
          }
        }

        if (successTotalRecipients === 0) {
          return Response.json(
            {
              success: false,
              message: "No target users are connected",
              targetUsers,
              error: "NO_CONNECTION",
            },
            { status: 404 },
          );
        }

        eventDetails.message = validatedData.message;
        eventDetails.recipients = successTotalRecipients;
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
