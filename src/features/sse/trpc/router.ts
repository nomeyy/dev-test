import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { logger } from "@/utils/logging";
import { observable } from "@trpc/server/observable";
import { sseService } from "@/lib/sse";

import type { ClientSSEMessage } from "../models/SSEModel";
import { sendToAllMessage, sendUserMessage } from "../utils/sse-utils";
import { nanoid } from "nanoid";
import { EVENT_DESTINATION } from "@/lib/sse/types";

const log = logger.createContextLogger("SSE-TRPC");

const SSEConnectionSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

const SendTestMessageSchema = z.object({
  type: z.enum([EVENT_DESTINATION.ALL, EVENT_DESTINATION.USER]),
  event: z.string().min(1, "Event name is required"),
  data: z.record(z.unknown()),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const sseRouter = createTRPCRouter({
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
        const clientId = `${Date.now()}-${nanoid()}`;

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
              // on close
            },
            error: () => {
              // on error
            },
            desiredSize: 1,
          },
          lastActivity: Date.now(),
          isConnected: true,
        };

        sseService.addClient(client);

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

  sendTestMessage: publicProcedure
    .input(SendTestMessageSchema)
    .mutation(async ({ input }) => {
      const { type, event, data, userId, sessionId } = input;

      try {
        switch (type) {
          case EVENT_DESTINATION.ALL:
            await sendToAllMessage(event, data);
            break;

          case EVENT_DESTINATION.USER:
            if (!userId) {
              throw new Error("userId is required for user notifications");
            }
            await sendUserMessage(userId, event, data);
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
