import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { sseManager } from "@/features/notifications"; // adjust path
import { TRPCError } from "@trpc/server";

export const notificationsRouter = createTRPCRouter({
  sendTestEvent: protectedProcedure
    .input(
      z.object({
        eventName: z.string(),
        payload: z.any(),
        targetUserId: z.string().nullish(),
        targetUserIds: z.array(z.string()).optional(),
        broadcastAll: z.boolean().optional().default(false),
      }),
    )
    .mutation(({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const { eventName, payload, targetUserId, targetUserIds, broadcastAll } =
        input;
      if (broadcastAll) {
        sseManager.broadcastEvent(eventName, {
          from: userId,
          ...payload,
        });
      } else if (targetUserIds && targetUserIds.length > 0) {
        for (const tid of targetUserIds) {
          sseManager.sendEvent(tid, eventName, {
            from: userId,
            ...payload,
          });
        }
      } else if (targetUserId) {
        sseManager.sendEvent(targetUserId, eventName, {
          from: userId,
          ...payload,
        });
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must specify targetUserId, targetUserIds, or broadcastAll",
        });
      }

      return { sent: true };
    }),
});
