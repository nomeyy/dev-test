import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/lib/trpc";
import { sseService } from "../services/sse-service";

/**
 * SSE tRPC Router
 * Provides tRPC procedures for sending SSE events and managing connections
 */
export const sseRouter = createTRPCRouter({
  /**
   * Send a test message (public, for demo purposes)
   */
  sendTestMessage: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(500),
        broadcast: z.boolean().optional().default(false),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const options = input.broadcast
        ? { broadcast: true }
        : input.userId
          ? { userId: input.userId }
          : { broadcast: true }; // Default to broadcast if no specific target

      await sseService.sendTestMessage(input.message, options);

      return {
        success: true,
        message: "Test message sent successfully",
        sentTo: input.broadcast
          ? "all users"
          : input.userId
            ? `user ${input.userId}`
            : "all users",
      };
    }),

  /**
   * Send a notification to a specific user (protected)
   */
  sendUserNotification: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string().min(1).max(100),
        message: z.string().min(1).max(500),
        data: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await sseService.sendUserNotification(
        input.userId,
        input.title,
        input.message,
        input.data,
      );

      return {
        success: true,
        message: "User notification sent successfully",
      };
    }),

  /**
   * Broadcast a notification to all users (protected)
   */
  broadcastNotification: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        message: z.string().min(1).max(500),
        data: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await sseService.broadcastNotification(
        input.title,
        input.message,
        input.data,
      );

      return {
        success: true,
        message: "Broadcast notification sent successfully",
      };
    }),

  /**
   * Send a user update event (protected)
   */
  sendUserUpdate: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        updateType: z.string().min(1).max(50),
        data: z.any(),
      }),
    )
    .mutation(async ({ input }) => {
      await sseService.sendUserUpdate(
        input.userId,
        input.updateType,
        input.data,
      );

      return {
        success: true,
        message: "User update sent successfully",
      };
    }),

  /**
   * Send a custom event (protected)
   */
  sendCustomEvent: protectedProcedure
    .input(
      z.object({
        eventType: z.string().min(1).max(50),
        data: z.any(),
        userId: z.string().optional(),
        broadcast: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const options = input.broadcast
        ? { broadcast: true }
        : input.userId
          ? { userId: input.userId }
          : { broadcast: true };

      await sseService.sendCustomEvent(input.eventType, input.data, options);

      return {
        success: true,
        message: "Custom event sent successfully",
      };
    }),

  /**
   * Get SSE connection statistics (protected)
   */
  getStats: protectedProcedure.query(async () => {
    const stats = await sseService.getStats();
    return stats;
  }),

  /**
   * Get SSE connection statistics (public, for demo)
   */
  getPublicStats: publicProcedure.query(async () => {
    const stats = await sseService.getStats();
    return {
      totalConnections: stats.totalConnections,
      // Don't expose user connection details in public endpoint
    };
  }),
});
