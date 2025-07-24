import { z } from "zod";
import { EVENT_DESTINATION } from "@/lib/sse/types";

export const SSEEventSchema = z.object({
  id: z.string().optional(),
  event: z.string().min(1, "Event name is required"),
  data: z.record(z.unknown()),
  retry: z.number().positive().optional(),
});

export const SSEMessageSchema = z.object({
  event: z.string().min(1, "Event name is required"),
  data: z.record(z.unknown()),
  target: z
    .union([
      z.literal(EVENT_DESTINATION.ALL),
      z.literal(EVENT_DESTINATION.USER),
      z.array(z.string()),
    ])
    .optional()
    .default(EVENT_DESTINATION.ALL),
  exclude: z.array(z.string()).optional().default([]),
});

export const SSEConnectionOptionsSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  heartbeatInterval: z.number().positive().optional(),
  maxIdleTime: z.number().positive().optional(),
});

export const ClientSSEMessageSchema = z.object({
  id: z.string().optional(),
  event: z.string().min(1, "Event name is required"),
  data: z.record(z.unknown()),
  timestamp: z.number().optional(),
});

export const ClientSSEConnectionOptionsSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  onMessage: z.function().optional(),
  onConnect: z.function().optional(),
  onDisconnect: z.function().optional(),
  onError: z.function().optional(),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;
export type SSEMessage = z.infer<typeof SSEMessageSchema>;
export type SSEConnectionOptions = z.infer<typeof SSEConnectionOptionsSchema>;
export type ClientSSEMessage = z.infer<typeof ClientSSEMessageSchema>;
export type ClientSSEConnectionOptions = z.infer<
  typeof ClientSSEConnectionOptionsSchema
>;
