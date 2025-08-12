import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { z } from "zod";
import { 
  notifyUser, 
  broadcast, 
  notifyTopic, 
  notifySession,
  notifyConnection,
  notifyNewMessage,
  notifySystemUpdate,
  notifyUserStatus,
  notifyLiveUpdate,
  getStats,
  getConnectionInfo,
  getUserConnections,
  getTopicConnections,
  healthCheck
} from "@/server/sse";

export const sseRouter = createTRPCRouter({
  // Basic test endpoints
  debugSend: protectedProcedure.mutation(async ({ ctx }) => {
    await notifyUser(ctx.session.user.id, "test", { ok: true, at: Date.now() });
    await broadcast("test", { msg: "Hello all" });
    return { ok: true };
  }),

  // Send test message to current user
  sendTestToUser: protectedProcedure
    .input(z.object({
      message: z.string().optional(),
      event: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const event = input.event || "test_message";
      const message = input.message || "Hello from SSE!";
      
      await notifyUser(ctx.session.user.id, event, { 
        message, 
        timestamp: Date.now(),
        userId: ctx.session.user.id 
      });
      
      return { success: true, event, message };
    }),

  // Send test message to a topic
  sendTestToTopic: protectedProcedure
    .input(z.object({
      topic: z.string(),
      message: z.string().optional(),
      event: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const event = input.event || "topic_message";
      const message = input.message || "Hello from topic!";
      
      await notifyTopic(input.topic, event, { 
        message, 
        timestamp: Date.now(),
        topic: input.topic 
      });
      
      return { success: true, event, message, topic: input.topic };
    }),

  // Send test broadcast
  sendTestBroadcast: protectedProcedure
    .input(z.object({
      message: z.string().optional(),
      event: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const event = input.event || "broadcast_message";
      const message = input.message || "Hello everyone!";
      
      await broadcast(event, { 
        message, 
        timestamp: Date.now() 
      });
      
      return { success: true, event, message };
    }),

  // Send test message to specific session
  sendTestToSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      message: z.string().optional(),
      event: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const event = input.event || "session_message";
      const message = input.message || "Hello from session!";
      
      await notifySession(input.sessionId, event, { 
        message, 
        timestamp: Date.now(),
        sessionId: input.sessionId 
      });
      
      return { success: true, event, message, sessionId: input.sessionId };
    }),

  // Utility notification endpoints
  sendNewMessage: protectedProcedure
    .input(z.object({
      userId: z.string(),
      message: z.object({
        id: z.string(),
        content: z.string(),
        sender: z.string(),
        roomId: z.string().optional()
      })
    }))
    .mutation(async ({ input }) => {
      await notifyNewMessage(input.userId, input.message);
      return { success: true };
    }),

  sendSystemUpdate: protectedProcedure
    .input(z.object({
      event: z.string(),
      data: z.any()
    }))
    .mutation(async ({ input }) => {
      await notifySystemUpdate(input.event, input.data);
      return { success: true };
    }),

  sendUserStatus: protectedProcedure
    .input(z.object({
      userId: z.string(),
      status: z.string()
    }))
    .mutation(async ({ input }) => {
      await notifyUserStatus(input.userId, input.status);
      return { success: true };
    }),

  sendLiveUpdate: protectedProcedure
    .input(z.object({
      topic: z.string(),
      data: z.any()
    }))
    .mutation(async ({ input }) => {
      await notifyLiveUpdate(input.topic, input.data);
      return { success: true };
    }),

  // Monitoring and management endpoints
  getStats: protectedProcedure.query(() => {
    return getStats();
  }),

  getHealth: protectedProcedure.query(() => {
    return healthCheck();
  }),

  getConnectionInfo: protectedProcedure
    .input(z.object({
      connId: z.string()
    }))
    .query(({ input }) => {
      return getConnectionInfo(input.connId);
    }),

  getUserConnections: protectedProcedure
    .input(z.object({
      userId: z.string()
    }))
    .query(({ input }) => {
      return getUserConnections(input.userId);
    }),

  getTopicConnections: protectedProcedure
    .input(z.object({
      topic: z.string()
    }))
    .query(({ input }) => {
      return getTopicConnections(input.topic);
    }),

  // Get current user's connections
  getMyConnections: protectedProcedure.query(({ ctx }) => {
    return getUserConnections(ctx.session.user.id);
  }),
});
