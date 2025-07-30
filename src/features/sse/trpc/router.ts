import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/lib/trpc";
import { z } from "zod";
import { sseManager } from "../services/sse-manager";
import {
  sendNotificationToClient,
  sendSystemNotification,
  sendUserNotification,
  broadcastNotification,
} from "../utils/sse-utils";

export const sseRouter = createTRPCRouter({
  // Get SSE connection statistics
  getStats: publicProcedure.query(() => {
    return sseManager.getStats();
  }),

  // Get active client IDs
  getActiveClients: publicProcedure.query(() => {
    return sseManager.getActiveClientIds();
  }),

  // Check if a client is connected
  isClientConnected: publicProcedure
    .input(z.object({ clientId: z.string() }))
    .query(({ input }) => {
      return sseManager.isClientConnected(input.clientId);
    }),

  // Send a test notification to a specific client
  sendTestNotification: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        message: z.string(),
        event: z.string().default("test"),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await sendNotificationToClient(
        input.clientId,
        input.event,
        {
          message: input.message,
          timestamp: Date.now(),
          type: "test",
        },
      );
      return { success };
    }),

  // Send a system notification
  sendSystemNotification: publicProcedure
    .input(
      z.object({
        message: z.string(),
        type: z.enum(["info", "warning", "error"]).default("info"),
      }),
    )
    .mutation(async ({ input }) => {
      const count = await sendSystemNotification(input.message, input.type);
      return { sentTo: count };
    }),

  // Send a user notification
  sendUserNotification: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string(),
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]).default("info"),
        actionUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const count = await sendUserNotification(
        input.userId,
        input.title,
        input.message,
        input.type,
        input.actionUrl,
      );
      return { sentTo: count };
    }),

  // Broadcast a notification
  broadcastNotification: publicProcedure
    .input(
      z.object({
        event: z.string(),
        message: z.string(),
        data: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const count = await broadcastNotification(input.event, {
        message: input.message,
        timestamp: Date.now(),
        ...input.data,
      });
      return { sentTo: count };
    }),
});
