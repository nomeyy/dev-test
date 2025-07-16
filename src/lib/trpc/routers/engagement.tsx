import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { sseManager } from "@/lib/sseManager";

export const engagementRouter = createTRPCRouter({
  trigger: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const now = new Date();
      const payload = {
        type: "like",
        videoId: "abc123",
        message: "🔥 Your video got a new like!",
        time: now.toLocaleTimeString(),
      };

      sseManager.sendToClient(input.userId, "engagement", payload);

      return { ok: true };
    }),

  broadcast: publicProcedure.mutation(() => {
    const payload = {
      type: "broadcast",
      message: "🚀 New feature just dropped!",
      time: new Date().toLocaleTimeString(),
    };

    sseManager.broadcast("engagement", payload);

    return { ok: true };
  }),
});
