import { tracked } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { realtimeService } from "../services/realtime-service";
import { getHeartbeatConfig } from "../config/heartbeat";
import {
  RealtimeSubscriptionInputSchema,
  type RealtimeEvent,
  type RealtimePublishOptions,
} from "../types";

export const realtimeRouter = createTRPCRouter({
  subscribe: protectedProcedure
    .input(RealtimeSubscriptionInputSchema)
    .subscription(async function* (opts) {
      const { signal, ctx } = opts;
      const userId = ctx.session.user.id;

      try {
        // TODO: Handle lastEventId for reconnection
        // In a production system, we'd query for missed events since lastEventId
        // For now, we'll start fresh and rely on application-level logic
        // to handle missed events

        // Create an async iterator that will yield realtime events
        const events: RealtimeEvent[] = [];
        let eventIndex = 0;

        // Subscribe to realtime events
        const unsubscribe = await realtimeService.subscribeToEvents(
          (event: RealtimeEvent, _options: RealtimePublishOptions) => {
            if (!signal?.aborted) {
              // Filter events: only include user-specific ones or broadcasts
              const shouldInclude =
                (_options.broadcast ?? false) || // Global broadcasts
                event.userId === userId || // Targeted to this user
                !event.userId; // Legacy events without userId

              if (shouldInclude) {
                events.push(event);
              }
            }
          },
        );

        // Configure heartbeat to prevent idle connection termination
        const heartbeatConfig = getHeartbeatConfig();
        let heartbeatInterval: NodeJS.Timeout | null = null;

        if (heartbeatConfig.enabled) {
          // For tRPC SSE subscriptions, heartbeat is handled by httpSubscriptionLink
          // We can yield heartbeat events that clients can filter out
          heartbeatInterval = setInterval(() => {
            if (!signal?.aborted) {
              // Yield a heartbeat event to keep the SSE connection alive
              // Client will receive this but can ignore it
              events.push({
                id: `heartbeat-${Date.now()}`,
                type: "info" as const,
                title: "heartbeat",
                message: "ping",
                timestamp: new Date(),
                userId: "system",
              });

              // Heartbeat ping sent via SSE
            }
          }, heartbeatConfig.intervalMs);

          // SSE heartbeat enabled for subscription
        }

        try {
          // Main subscription loop
          while (!signal?.aborted) {
            // Check for new events
            if (eventIndex < events.length) {
              const event = events[eventIndex];
              if (event) {
                // Added null check for safety
                eventIndex++;
                yield tracked(event.id, event);
              }
            }

            // Small delay to prevent tight loop
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } finally {
          // Cleanup when subscription ends
          if (heartbeatInterval !== null) {
            clearInterval(heartbeatInterval);
          }
          unsubscribe();
        }
      } catch (error) {
        throw error;
      }
    }),

  sendTest: protectedProcedure
    .input(RealtimeSubscriptionInputSchema)
    .mutation(async ({ input: _input, ctx }) => {
      const userId = ctx.session.user.id;
      const userName = ctx.session.user.name ?? "Unknown User";

      await realtimeService.sendInfoEvent(
        "Personal Test Event",
        `Hello ${userName}! This realtime event is just for you at ${new Date().toLocaleTimeString()}`,
        { userId },
      );

      return { success: true, timestamp: new Date(), userId };
    }),

  sendBroadcast: protectedProcedure.mutation(async ({ ctx }) => {
    const userName = ctx.session.user.name ?? "Unknown User";

    await realtimeService.sendSuccessEvent(
      "Broadcast Message",
      `${userName} sent a message to everyone at ${new Date().toLocaleTimeString()}`,
      { broadcast: true },
    );

    return { success: true, timestamp: new Date() };
  }),
});
