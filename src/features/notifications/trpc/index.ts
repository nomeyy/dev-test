import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";
import { notificationsService, setupMockEvents } from "../services";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("notifications-router");

// Initialize mock events when the router is loaded
setupMockEvents();

export const notificationsRouter = createTRPCRouter({
  /**
   * Subscribe to real-time notifications via SSE
   */
  subscribe: publicProcedure.subscription(({ ctx }) => {
    // Use a random ID for demo purposes to avoid having to use a protected route
    // In a real application, you would use a user ID or session ID to identify the subscriber
    const id = ctx.session?.user?.id ?? crypto.randomUUID();
    
    log.info("subscribing to notifications", "Subscriber ID:", id);
    
    try {
      return notificationsService.subscribe(id);
    } catch (error) {
      handleError("notifications subscription", error);
      throw error;
    }
  }),

  /**
   * Send a ping notification to all or specific subscribers
   */
  ping: publicProcedure
    .input(
      z.object({
        message: z.string().optional(),
        subIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input: { message, subIds } }) => {
      log.info("sending ping", { message, subIds });
      notificationsService.notify(subIds ?? [], message);
      return { success: true };
    }),

  /**
   * Get current connection stats
   */
  stats: publicProcedure.query(() => {
    return {
      clientCount: notificationsService.getClientCount(),
      clientIds: notificationsService.getClientIds(),
    };
  }),

  /**
   * Legacy endpoint for compatibility with Developer 1's implementation
   */
  list: publicProcedure.subscription(({ ctx }) => {
    const id = ctx.session?.user?.id ?? crypto.randomUUID();
    log.info("legacy subscription", "Subscriber ID:", id);
    return notificationsService.subscribe(id);
  }),

  /**
   * Legacy endpoint for compatibility with Developer 1's implementation
   */
  pingAll: publicProcedure
    .input(
      z.object({
        message: z.string().optional(),
        subIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input: { message, subIds } }) => {
      notificationsService.notify(subIds ?? [], message);
      return { success: true };
    }),
});