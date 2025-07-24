import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { z } from "zod";
import { sseEventDispatcher, sseManager } from "../index";
import { SSEEventModel } from "../types";

export const sseRouter = createTRPCRouter({
  getStats: protectedProcedure.query(() => {
    return sseManager.getStats();
  }),

  sendEvent: protectedProcedure.input(SSEEventModel).mutation(({ input }) => {
    const success = sseEventDispatcher.sendToUser(input.targetUserId!, {
      type: input.type,
      data: input.data,
    });

    return {
      success,
      message: success
        ? "Event sent successfully"
        : "No active connections for user",
    };
  }),

  broadcastEvent: protectedProcedure
    .input(
      z.object({
        type: z.string(),
        data: z.record(z.unknown()),
      }),
    )
    .mutation(({ input }) => {
      const success = sseEventDispatcher.broadcast({
        type: input.type,
        data: input.data,
      });

      return {
        success,
        message: success
          ? "Event broadcast successfully"
          : "No active connections",
      };
    }),

  sendUploadProgress: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        progress: z.number().min(0).max(100),
        uploadId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const success = sseEventDispatcher.sendUploadProgress(
        input.userId,
        input.progress,
        input.uploadId,
      );

      return {
        success,
        message: success
          ? "Upload progress sent"
          : "No active connections for user",
      };
    }),

  sendUploadComplete: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        uploadId: z.string(),
        playbackId: z.string().optional(),
      }),
    )
    .mutation(({ input }) => {
      const success = sseEventDispatcher.sendUploadComplete(
        input.userId,
        input.uploadId,
        input.playbackId,
      );

      return {
        success,
        message: success
          ? "Upload complete sent"
          : "No active connections for user",
      };
    }),

  sendUploadError: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        uploadId: z.string(),
        error: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const success = sseEventDispatcher.sendUploadError(
        input.userId,
        input.uploadId,
        input.error,
      );

      return {
        success,
        message: success
          ? "Upload error sent"
          : "No active connections for user",
      };
    }),

  sendNotification: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]).default("info"),
      }),
    )
    .mutation(({ input }) => {
      const success = sseEventDispatcher.sendUserNotification(
        input.userId,
        input.message,
        input.type,
      );

      return {
        success,
        message: success
          ? "Notification sent"
          : "No active connections for user",
      };
    }),

  hasActiveConnections: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(({ input }) => {
      const connections = sseManager.getUserConnections(input.userId);
      return {
        hasConnections: connections.length > 0,
        connectionCount: connections.length,
      };
    }),
});
