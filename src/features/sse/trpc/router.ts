import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { sseService } from "../services/sse-service";
import { sseManager } from "../services/sse-manager";
import { TRPCError } from "@trpc/server";

const NotificationInputSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  severity: z.enum(["info", "warning", "error", "success"]).default("info"),
});

const CustomEventInputSchema = z.object({
  eventType: z.string().min(1).max(50),
  data: z.record(z.unknown()),
  targetUserId: z.string().optional(),
});

const BroadcastAlertInputSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  severity: z.enum(["info", "warning", "error", "success"]).default("warning"),
});

export const sseRouter = createTRPCRouter({
  sendNotification: protectedProcedure
    .input(NotificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const success = await sseService.notifyUser(ctx.session.user.id, {
          title: input.title,
          message: input.message,
          severity: input.severity,
          timestamp: Date.now(),
        });

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send notification",
          });
        }

        return { success: true, message: "Notification sent successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send notification",
        });
      }
    }),

  sendCustomEvent: protectedProcedure
    .input(CustomEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const targetUserId = input.targetUserId ?? ctx.session.user.id;
        const successCount = await sseService.sendCustomEvent(
          targetUserId,
          input.eventType,
          input.data,
        );

        return {
          success: successCount > 0,
          message: `Event sent to ${successCount} connection(s)`,
          successCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send custom event",
        });
      }
    }),

  broadcastAlert: protectedProcedure
    .input(BroadcastAlertInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const successCount = await sseService.broadcastAlert({
          title: input.title,
          message: input.message,
          severity: input.severity,
          timestamp: Date.now(),
        });

        return {
          success: successCount > 0,
          message: `Alert broadcasted to ${successCount} connection(s)`,
          successCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to broadcast alert",
        });
      }
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = sseService.getStats();
      const userConnections = sseManager.getUserConnections(
        ctx.session.user.id,
      );

      return {
        ...stats,
        currentUserConnections: userConnections.length,
        currentUserConnectionDetails: userConnections,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get SSE stats",
      });
    }
  }),

  ping: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const success = await sseService.sendCustomEvent(
        ctx.session.user.id,
        "ping",
        {
          message: "Pong! SSE is working correctly.",
          timestamp: Date.now(),
          userId: ctx.session.user.id,
        },
      );

      return {
        success: success > 0,
        message:
          success > 0
            ? "Ping sent successfully"
            : "No active connections found",
        connectionsReached: success,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send ping",
      });
    }
  }),

  sendDemoNotification: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const demoMessages = [
        {
          title: "Demo Success",
          message: "This is a success notification!",
          severity: "success" as const,
        },
        {
          title: "Demo Info",
          message: "This is an info notification with some details.",
          severity: "info" as const,
        },
        {
          title: "Demo Warning",
          message: "This is a warning notification. Please pay attention!",
          severity: "warning" as const,
        },
        {
          title: "Demo Error",
          message: "This is an error notification. Something went wrong!",
          severity: "error" as const,
        },
      ];

      const randomDemo =
        demoMessages[Math.floor(Math.random() * demoMessages.length)]!;

      const success = await sseService.notifyUser(ctx.session.user.id, {
        ...randomDemo,
        timestamp: Date.now(),
      });

      return {
        success,
        message: success
          ? "Demo notification sent!"
          : "Failed to send demo notification",
        demoType: randomDemo.severity,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send demo notification",
      });
    }
  }),

  simulateUploadProgress: protectedProcedure
    .input(
      z.object({
        duration: z.number().min(1000).max(30000).default(5000), // 1-30 seconds
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const uploadId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const userId = ctx.session.user.id;
        const steps = 10;
        const interval = input.duration / steps;

        for (let i = 0; i <= steps; i++) {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          setTimeout(async () => {
            const progress = Math.round((i / steps) * 100);
            let status: "uploading" | "processing" | "complete" | "error";
            let message: string;

            if (i === 0) {
              status = "uploading";
              message = "Starting upload...";
            } else if (i < steps * 0.7) {
              status = "uploading";
              message = `Uploading... ${progress}%`;
            } else if (i < steps) {
              status = "processing";
              message = "Processing video...";
            } else {
              status = "complete";
              message = "Upload complete!";
            }

            await sseService.updateUploadProgress(userId, {
              uploadId,
              progress,
              status,
              message,
            });

            if (i === steps) {
              await sseService.sendCustomEvent(userId, "upload_complete", {
                uploadId,
                assetId: `asset-${uploadId}`,
                message: "Your video is ready for viewing!",
              });
            }
          }, i * interval);
        }

        return {
          success: true,
          message: "Upload simulation started",
          uploadId,
          duration: input.duration,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to simulate upload progress",
        });
      }
    }),
});
