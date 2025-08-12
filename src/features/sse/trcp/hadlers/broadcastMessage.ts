import type { BroadcastMessageInput } from "@/features/sse/types";
import { createServiceContext } from "@/utils/service-utils";
import { TRPCError } from "@trpc/server";
import { broadcastEvent } from "@/features/sse";

const { log } = createServiceContext("sseBroadcastMessageHandler");

export const broadcastMessageHandler = async ({
  input,
}: {
  input: BroadcastMessageInput;
}) => {
  log.info("broadcasting message", input);

  try {
    const payload = input.data ?? { text: input.message ?? "" };
    const delivered = broadcastEvent(input.event, payload);
    return { ok: true, delivered } as const;
  } catch (error) {
    log.error("broadcasting message", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to broadcast message",
    });
  }
};
