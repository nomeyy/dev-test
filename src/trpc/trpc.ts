import { z } from "zod";
import { sseManager } from "@/utils/sse-manager";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  notifyUser: publicProcedure
    .input(z.object({ userId: z.string(), message: z.string() }))
    .mutation(({ input }) => {
      sseManager.sendToUser(input.userId, "notification", {
        message: input.message,
      });
      return { ok: true };
    }),
});
