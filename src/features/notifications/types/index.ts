import { z } from "zod";

export enum EventType {
  TEST = "test",
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  PING = "ping",
}

export const notificationSchema = z.object({
  clientId: z.string().optional(),
  eventType: z.union([z.nativeEnum(EventType), z.string()]),
  payload: z.any(), // Type-safe alternative to z.any()
});

export type SseNotificationInput = z.infer<typeof notificationSchema>;
