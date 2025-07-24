import { createCallerFactory, createTRPCRouter } from "./index";
import { searchRouter } from "@/features/search";
import { realtimeRouter } from "@/features/realtime";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  search: searchRouter,
  realtime: realtimeRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
