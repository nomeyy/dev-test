import { z } from "zod";
import { protectedProcedure, createTRPCRouter as router } from "@/lib/trpc";
import { sendSSEEvent, broadcastSSEEvent } from "../services/sse-service";

export const notificationsRouter = router({
  sendTest: protectedProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const success = sendSSEEvent(userId, "test", { message: input.message });
      return { success };
    }),

  broadcastTest: protectedProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      broadcastSSEEvent("test", { message: `BROADCAST: ${input.message}` });
      return { success: true };
    }),
});
