import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { sseService } from "../../services/sse-service";
import { createServiceContext } from "@/utils/service-utils";
import { SSEEventType } from "../../types";
import type { SSEEventUnion } from "../../types";

const { log } = createServiceContext("SSETestHandler");

export interface SendTestEventInput {
  type: SSEEventType;
  connectionId?: string;
  userId?: string;
  data?: Record<string, unknown>;
}

export const sendTestEventHandler = async (opts: {
  input: SendTestEventInput;
}) => {
  const { input } = opts;
  log.info("Sending test event", {
    type: input.type,
    connectionId: input.connectionId,
    userId: input.userId,
  });

  try {
    // Create the test event based on type
    const baseEvent = {
      id: nanoid(),
      type: input.type,
      timestamp: Date.now(),
    };

    let event: SSEEventUnion;

    switch (input.type) {
      case SSEEventType.NOTIFICATION:
        event = {
          ...baseEvent,
          type: SSEEventType.NOTIFICATION,
          data: {
            title: "Test Notification",
            message: "This is a test notification",
            level: "info" as const,
            ...input.data,
          },
        };
        break;

      case SSEEventType.SYSTEM_MESSAGE:
        event = {
          ...baseEvent,
          type: SSEEventType.SYSTEM_MESSAGE,
          data: {
            message: "Test system message",
            level: "info" as const,
            ...input.data,
          },
        };
        break;

      case SSEEventType.USER_UPDATE:
        event = {
          ...baseEvent,
          type: SSEEventType.USER_UPDATE,
          data: {
            userId: input.userId || "test-user",
            field: "test-field",
            value: "test-value",
            ...input.data,
          },
        };
        break;

      case SSEEventType.REEL_UPLOAD_STATUS:
        event = {
          ...baseEvent,
          type: SSEEventType.REEL_UPLOAD_STATUS,
          data: {
            uploadId: "test-upload-123",
            status: "processing" as const,
            progress: 50,
            message: "Test upload processing",
            ...input.data,
          },
        };
        break;

      case SSEEventType.PING:
        event = {
          ...baseEvent,
          type: SSEEventType.PING,
          data: {
            message: "test-ping",
            ...input.data,
          },
        };
        break;

      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported event type: ${input.type}`,
        });
    }

    // Send the event based on target
    let result;
    if (input.connectionId) {
      const success = await sseService.sendEventToConnection(
        input.connectionId,
        event,
      );
      result = { success, sentCount: success ? 1 : 0 };
    } else if (input.userId) {
      const sentCount = await sseService.sendEventToUser(input.userId, event);
      result = { success: sentCount > 0, sentCount };
    } else {
      const sentCount = await sseService.broadcastEvent(event);
      result = { success: sentCount > 0, sentCount };
    }

    return {
      ...result,
      event,
      message: `Test event sent to ${result.sentCount} connection(s)`,
    };
  } catch (error) {
    log.error("Failed to send test event", error);

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send test event",
    });
  }
};
