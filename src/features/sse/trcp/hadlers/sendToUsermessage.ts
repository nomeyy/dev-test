import type { SendMessageToUserInput } from "@/features/sse/types";
import { createServiceContext } from "@/utils/service-utils";
import { TRPCError } from "@trpc/server";
import { sendEventToUser } from "@/features/sse";

const { log } = createServiceContext("sseToUserMessageHandler");

export const sendToUserMessageHandler = async ({
  input,
}: {
  input: SendMessageToUserInput;
}) => {
  log.info("sending message to user", input);

  try {
    const payload = input.data ?? { text: input.message ?? "" };
    const delivered = sendEventToUser(input.userId, input.event, payload);
    return { ok: true, delivered } as const;
  } catch (error) {
    log.error("sending message to user", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send message to user",
    });
  }
};
