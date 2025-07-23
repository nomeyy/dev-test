import { TRPCError } from "@trpc/server";
import { sseService } from "../../services/sse-service";
import { createServiceContext } from "@/utils/service-utils";
import type { SSEEventUnion } from "../../types";

const { log } = createServiceContext("SSEHandlers");

export interface SendEventToConnectionInput {
  connectionId: string;
  event: SSEEventUnion;
}

export interface SendEventToUserInput {
  userId: string;
  event: SSEEventUnion;
}

export interface SendEventToConnectionsInput {
  connectionIds: string[];
  event: SSEEventUnion;
}

export interface BroadcastEventInput {
  event: SSEEventUnion;
}

export const sendEventToConnectionHandler = async (opts: {
  input: SendEventToConnectionInput;
}) => {
  const { input } = opts;
  log.info("Sending event to connection", {
    connectionId: input.connectionId,
    eventType: input.event.type,
  });

  try {
    const success = await sseService.sendEventToConnection(
      input.connectionId,
      input.event,
    );

    if (!success) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Connection not found or failed to send event",
      });
    }

    return { success: true };
  } catch (error) {
    log.error("Failed to send event to connection", error);

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send event to connection",
    });
  }
};

export const sendEventToUserHandler = async (opts: {
  input: SendEventToUserInput;
}) => {
  const { input } = opts;
  log.info("Sending event to user", {
    userId: input.userId,
    eventType: input.event.type,
  });

  try {
    const sentCount = await sseService.sendEventToUser(
      input.userId,
      input.event,
    );

    return {
      success: true,
      sentCount,
      message: `Event sent to ${sentCount} connection(s)`,
    };
  } catch (error) {
    log.error("Failed to send event to user", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send event to user",
    });
  }
};

export const sendEventToConnectionsHandler = async (opts: {
  input: SendEventToConnectionsInput;
}) => {
  const { input } = opts;
  log.info("Sending event to selected connections", {
    connectionIds: input.connectionIds,
    eventType: input.event.type,
  });

  try {
    const sentCount = await sseService.sendEventToConnections(
      input.connectionIds,
      input.event,
    );

    return {
      success: true,
      sentCount,
      message: `Event sent to ${sentCount} of ${input.connectionIds.length} selected connection(s)`,
    };
  } catch (error) {
    log.error("Failed to send event to selected connections", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send event to selected connections",
    });
  }
};

export const broadcastEventHandler = async (opts: {
  input: BroadcastEventInput;
}) => {
  const { input } = opts;
  log.info("Broadcasting event", {
    eventType: input.event.type,
  });

  try {
    const sentCount = await sseService.broadcastEvent(input.event);

    return {
      success: true,
      sentCount,
      message: `Event broadcasted to ${sentCount} connection(s)`,
    };
  } catch (error) {
    log.error("Failed to broadcast event", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to broadcast event",
    });
  }
};
