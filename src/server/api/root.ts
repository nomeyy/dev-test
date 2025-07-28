import { createTRPCRouter } from "@/server/api/trpc";
import { notifyRouter } from "@/server/api/routers/notify";

export const appRouter = createTRPCRouter({
  notify: notifyRouter,
});

export type AppRouter = typeof appRouter;
