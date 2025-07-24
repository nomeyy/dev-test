import { z } from "zod";

export const SSEEventModel = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
  targetUserId: z.string().optional(),
  timestamp: z.number().default(() => Date.now()),
});

export type SSEEvent = z.infer<typeof SSEEventModel>;

export const SSEConnectionModel = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.number(),
  lastPing: z.number(),
  isActive: z.boolean(),
});

export type SSEConnection = z.infer<typeof SSEConnectionModel>;

export const SSEManagerConfigModel = z.object({
  heartbeatInterval: z.number().default(30000),
  maxConnections: z.number().default(1000),
  cleanupInterval: z.number().default(60000),
});

export type SSEManagerConfig = z.infer<typeof SSEManagerConfigModel>;

export type SSEConnectionResponse = {
  success: boolean;
  connectionId?: string;
  error?: string;
};

export type SSEEventResponse = {
  success: boolean;
  eventId?: string;
  error?: string;
};

export const SSE_EVENT_TYPES = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  HEARTBEAT: "heartbeat",
  ERROR: "error",
  UPLOAD_PROGRESS: "upload.progress",
  UPLOAD_COMPLETE: "upload.complete",
  UPLOAD_ERROR: "upload.error",
  PROCESSING_STARTED: "processing.started",
  PROCESSING_COMPLETE: "processing.complete",
  PROCESSING_ERROR: "processing.error",
  USER_NOTIFICATION: "user.notification",
  USER_UPDATE: "user.update",
} as const;

export type SSEEventType =
  (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES];
