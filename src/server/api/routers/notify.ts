import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { sseManager } from "@/utils/sse-manager";
import { db } from "@/lib/db";

export const notifyRouter = createTRPCRouter({
  send: publicProcedure
    .input(z.object({ userId: z.string(), message: z.string() }))
    .mutation(({ input }) => {
      sseManager.sendToUser(input.userId, "notification", {
        message: input.message,
      });
      return { success: true };
    }),
  broadcast: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(({ input }) => {
      sseManager.broadcast("notification", { message: input.message });
      return { success: true };
    }),
  ping: publicProcedure.query(() => {
    return "pong";
  }),
  listSessions: publicProcedure.query(async () => {
    return db.session.findMany({
      select: {
        sessionToken: true,
        userId: true,
        expires: true,
        user: true,
      },
      orderBy: {
        expires: "desc",
      },
    });
  }),
});
