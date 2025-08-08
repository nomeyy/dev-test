import { createServiceContext } from "@/utils/service-utils";
import { TRPCError } from "@trpc/server";
import type { SseNotificationInput } from "../../types";
import { SSEManager } from "@/lib/sse";

const { log } = createServiceContext("notifications-service");

export function sseNotificationHandler(input: SseNotificationInput) {
  try {
    log.info("Sending SSE notification", {
      clientId: input.clientId,
      eventType: input.eventType,
    });

    const sseManagerInstance = SSEManager.getInstance();

    if (input.clientId) {
      sseManagerInstance.sendEvent(input.clientId, {
        type: input.eventType,
        clientId: input.clientId,
        ...input.payload,
      });
      log.info(`Sent event to client: ${input.clientId}`, {
        eventType: input.eventType,
      });
    } else {
      sseManagerInstance.broadcast({
        type: input.eventType,
        ...input.payload,
      });
      log.info("Broadcast event to all clients", {
        eventType: input.eventType,
      });
    }

    return { success: true };
  } catch (error) {
    log.error("Failed to send SSE notification", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send SSE notification",
    });
  }
}
