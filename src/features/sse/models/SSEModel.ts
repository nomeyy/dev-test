import { z } from "zod";

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
      z.literal("all"),
      z.literal("user"),
      z.literal("session"),
      z.array(z.string()),
    ])
    .optional()
    .default("all"),
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
