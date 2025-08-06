import { createServiceContext } from "@/utils/service-utils";
import { TRPCError } from "@trpc/server";
import type { brodcastEventInput } from "../../types";
import { sseManager } from "@/lib/sse";

const { log } = createServiceContext("broadCastEvent");

export const brodcastEventHandler = async ({
  input,
}: {
  input: brodcastEventInput;
}) => {
  log.info("searching users", input);
  try {
    await sseManager.broadcast("TestBroadCastEvent", input);
  } catch (error) {
    // Don't user `handleError` here, as we want to throw a TRPCError
    log.error("searching users", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to search users",
    });
  }
};
