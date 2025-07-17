import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { logger } from "@/utils/logging";
import { observable } from "@trpc/server/observable";
import { sseService } from "@/lib/sse";

import type { ClientSSEMessage } from "../models/SSEModel";
import { broadcastMessage, sendUserNotification } from "../utils/sse-utils";

const log = logger.createContextLogger("SSE-TRPC");

/**
 * Input schema for SSE connection
 */
const SSEConnectionSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

/**
 * Input schema for sending test messages
 */
const SendTestMessageSchema = z.object({
  type: z.enum(["broadcast", "user"]),
  event: z.string().min(1, "Event name is required"),
  data: z.record(z.unknown()),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

/**
 * SSE tRPC router for handling real-time messaging operations
 */
export const sseRouter = createTRPCRouter({
  /**
   * Subscribe to SSE events via tRPC subscription
   */
  subscribe: publicProcedure
    .input(SSEConnectionSchema)
    .subscription(async ({ input }) => {
      const { userId, sessionId } = input;

      return observable<{
        id: string;
        event: string;
        data: Record<string, unknown>;
        timestamp: number;
      }>((emit) => {
        const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const client = {
          id: clientId,
          userId: userId ?? undefined,
          sessionId: sessionId ?? undefined,
          response: new Response(),
          controller: {
            enqueue: (data: Uint8Array) => {
              try {
                const message = new TextDecoder().decode(data);
                const lines = message.split("\n");
                const eventData = {} as ClientSSEMessage;

                for (const line of lines) {
                  if (line.startsWith("event: ")) {
                    eventData.event = line.substring(7);
                  } else if (line.startsWith("data: ")) {
                    eventData.data = JSON.parse(line.substring(6)) as Record<
                      string,
                      unknown
                    >;
                  } else if (line.startsWith("id: ")) {
                    eventData.id = line.substring(4);
                  }
                }

                if (eventData.event && eventData.data) {
                  emit.next({
                    id: eventData.id ?? Date.now().toString(),
                    event: eventData.event,
                    data: eventData.data,
                    timestamp: Date.now(),
                  });
                }
              } catch (error) {
                log.error("Error parsing SSE message in subscription", error);
              }
            },
            close: () => {
              // Handle close
            },
            error: () => {
              // Handle error
            },
            desiredSize: 1,
          },
          lastActivity: Date.now(),
          isConnected: true,
        };

        sseService.addClient(client);

        // Send initial connection message
        emit.next({
          id: Date.now().toString(),
          event: "connected",
          data: {
            clientId,
            userId,
            sessionId,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });

        return () => {
          sseService.removeClient(clientId);
        };
      });
    }),

  /**
   * Send a test message via SSE
   */
  sendTestMessage: publicProcedure
    .input(SendTestMessageSchema)
    .mutation(async ({ input }) => {
      const { type, event, data, userId, sessionId } = input;

      try {
        switch (type) {
          case "broadcast":
            await broadcastMessage(event, data);
            break;

          case "user":
            if (!userId) {
              throw new Error("userId is required for user notifications");
            }
            await sendUserNotification(userId, event, data);
            break;
        }

        log.info(`Test SSE message sent via tRPC`, {
          type,
          event,
          userId,
          sessionId,
        });

        return {
          success: true,
          message: `SSE message sent: ${type} - ${event}`,
          timestamp: Date.now(),
        };
      } catch (error) {
        log.error("Failed to send SSE test message via tRPC", error);
        throw error;
      }
    }),
});
