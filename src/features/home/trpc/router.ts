import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { broadcast, sendEvent } from "@/lib/sse";

export const sseRouter = createTRPCRouter({
  sendTestEvent: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ input }) => {
      sendEvent(`user-${input.userId}`, "job-update", {
        status: "✅ Test message sent!",
      });

      return { success: true };
    }),
  broadcastSystemMessage: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(({ input }) => {
      broadcast("system-notify", { message: input.message });
      return { success: true };
    }),
});
