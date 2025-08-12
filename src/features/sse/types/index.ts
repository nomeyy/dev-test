import { z } from "zod";

export const BroadcastMessageSchema = z
  .object({
    event: z.string().default("message"),
    message: z.string().optional(),
    data: z.any().optional(),
  })
  .default({
    event: "message",
    message: `Broadcast at ${new Date().toISOString()}`,
  });

export type BroadcastMessageInput = z.infer<typeof BroadcastMessageSchema>;

export const SendMessageToUserSchema = z
  .object({
    userId: z.string().min(1),
    event: z.string().default("message"),
    message: z.string().optional(),
    data: z.any().optional(),
  })
  .default({
    event: "message",
    message: `Broadcast at ${new Date().toISOString()}`,
    userId: "userId",
  });

export type SendMessageToUserInput = z.infer<typeof SendMessageToUserSchema>;

import type { NextRequest } from "next/server";

export type SSEClientId = string;

export type SSEEventName = string; // arbitrary named events e.g. "message", "notification", "ping"

export type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | JsonSerializable[]
  | { [key: string]: JsonSerializable };

export type SSEPayload = {
  event: SSEEventName;
  data: JsonSerializable;
  id?: string;
};

export type SSEWriteFn = (payload: SSEPayload) => void;

export type SSECloseFn = () => void;

export type SSEClient = {
  id: string; // per-connection id
  clientId: SSEClientId; // logical client (user/session)
  write: SSEWriteFn;
  close: SSECloseFn;
  createdAt: number;
  lastActivityAt: number;
};

export type ExtractClientIdFn = (request: NextRequest) => Promise<SSEClientId>;
