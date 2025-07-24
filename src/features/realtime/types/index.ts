import { z } from "zod";

/**
 * Schema for realtime events that can be sent to clients
 */
export const RealtimeEventSchema = z.object({
  id: z.string(),
  type: z.enum(["info", "success", "warning", "error"]),
  title: z.string(),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  userId: z.string().optional(),
});

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;

/**
 * Schema for subscription input parameters
 */
export const RealtimeSubscriptionInputSchema = z.object({
  lastEventId: z.string().optional(),
});

export type RealtimeSubscriptionInput = z.infer<
  typeof RealtimeSubscriptionInputSchema
>;

/**
 * Options for publishing realtime events
 */
export interface RealtimePublishOptions {
  userId?: string;
  broadcast?: boolean;
}
