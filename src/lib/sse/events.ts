import { z } from "zod";

// Define event schemas
const PingEventSchema = z.object({
  name: z.literal("ping"),
  data: z.object({}).optional(),
});

const MessageEventSchema = z.object({
  name: z.literal("message"),
  data: z.object({
    message: z.string(),
    timestamp: z.string().datetime(),
  }),
});

// Union of all possible events
export const SseEventSchema = z.union([PingEventSchema, MessageEventSchema]);

export type SseEvent = z.infer<typeof SseEventSchema>;
export type SseEventName = SseEvent["name"];

// Helper to create a typed event
export const createSseEvent = <T extends SseEventName>(
  name: T,
  data: Extract<SseEvent, { name: T }>["data"],
) => SseEventSchema.parse({ name, data });
