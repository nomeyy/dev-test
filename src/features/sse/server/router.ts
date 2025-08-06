import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { sseState } from "./state";
import { TRPCError } from "@trpc/server";

// Event schema
const EventSchema = z.object({
  type: z.string(),
  data: z.any(),
  targetClientId: z.string().optional(),
});

export const sseRouter = createTRPCRouter({
  sendEvent: publicProcedure.input(EventSchema).mutation(async ({ input }) => {
    const { type, data, targetClientId } = input;

    try {
      if (targetClientId) {
        if (!sseState.hasClient(targetClientId)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        await sseState.sendToClient(targetClientId, type, data);
        return { success: true, message: "Event sent to client" };
      } else {
        await sseState.broadcast(type, data);
        return { success: true, message: "Event broadcasted" };
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send event",
        cause: error,
      });
    }
  }),

  getActiveClients: publicProcedure.query(() => {
    return {
      count: sseState.getClientCount(),
      clients: sseState.getClientIds(),
    };
  }),
});
