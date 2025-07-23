import { z } from "zod";

/**
 * SSE Event Types
 * Define all possible event types that can be sent through SSE
 */
export enum SSEEventType {
  PING = "ping",
  NOTIFICATION = "notification",
  USER_UPDATE = "user_update",
  REEL_UPLOAD_STATUS = "reel_upload_status",
  SYSTEM_MESSAGE = "system_message",
}

/**
 * Base SSE Event Schema
 */
export const SSEEventSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(SSEEventType),
  timestamp: z.number(),
  data: z.record(z.unknown()).optional(),
});

/**
 * Specific Event Schemas
 */
export const PingEventSchema = SSEEventSchema.extend({
  type: z.literal(SSEEventType.PING),
  data: z
    .object({
      message: z.string().default("ping"),
    })
    .optional(),
});

export const NotificationEventSchema = SSEEventSchema.extend({
  type: z.literal(SSEEventType.NOTIFICATION),
  data: z.object({
    title: z.string(),
    message: z.string(),
    level: z.enum(["info", "warning", "error", "success"]).default("info"),
  }),
});

export const UserUpdateEventSchema = SSEEventSchema.extend({
  type: z.literal(SSEEventType.USER_UPDATE),
  data: z.object({
    userId: z.string(),
    field: z.string(),
    value: z.unknown(),
  }),
});

export const ReelUploadStatusEventSchema = SSEEventSchema.extend({
  type: z.literal(SSEEventType.REEL_UPLOAD_STATUS),
  data: z.object({
    uploadId: z.string(),
    status: z.enum(["uploading", "processing", "ready", "error"]),
    progress: z.number().min(0).max(100).optional(),
    message: z.string().optional(),
  }),
});

export const SystemMessageEventSchema = SSEEventSchema.extend({
  type: z.literal(SSEEventType.SYSTEM_MESSAGE),
  data: z.object({
    message: z.string(),
    level: z.enum(["info", "warning", "error"]).default("info"),
  }),
});

/**
 * Type definitions derived from schemas
 */
export type SSEEvent = z.infer<typeof SSEEventSchema>;
export type PingEvent = z.infer<typeof PingEventSchema>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type UserUpdateEvent = z.infer<typeof UserUpdateEventSchema>;
export type ReelUploadStatusEvent = z.infer<typeof ReelUploadStatusEventSchema>;
export type SystemMessageEvent = z.infer<typeof SystemMessageEventSchema>;

/**
 * Union type for all possible SSE events
 */
export type SSEEventUnion =
  | PingEvent
  | NotificationEvent
  | UserUpdateEvent
  | ReelUploadStatusEvent
  | SystemMessageEvent;

/**
 * Client Connection Information
 */
export interface SSEClientConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastPing: Date;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

/**
 * SSE Service Interface
 */
export interface SSEServiceInterface {
  // Connection management
  addConnection(connection: SSEClientConnection): void;
  removeConnection(connectionId: string): void;
  getConnection(connectionId: string): SSEClientConnection | undefined;
  getConnectionsByUserId(userId: string): SSEClientConnection[];
  getActiveConnectionCount(): number;
  getAllConnections(): SSEClientConnection[];
  getConnectionDetails(): Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
    lastPing: Date;
  }>;

  // Event sending
  sendEventToConnection(
    connectionId: string,
    event: SSEEventUnion,
  ): Promise<boolean>;
  sendEventToConnections(
    connectionIds: string[],
    event: SSEEventUnion,
  ): Promise<number>;
  sendEventToUser(userId: string, event: SSEEventUnion): Promise<number>;
  broadcastEvent(event: SSEEventUnion): Promise<number>;

  // Heartbeat management
  startHeartbeat(): void;
  stopHeartbeat(): void;
  pingConnection(connectionId: string): Promise<boolean>;
  pingAllConnections(): Promise<number>;

  // Cleanup
  cleanup(): void;
}

/**
 * SSE Hook Options
 */
export interface UseSSEOptions {
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onEvent?: (event: SSEEventUnion) => void;
}

/**
 * SSE Hook Return Type
 */
export interface UseSSEReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastEvent: SSEEventUnion | null;
  connectionId: string | null;
  connect: () => void;
  disconnect: () => void;
  sendTestEvent: (
    type: SSEEventType,
    data?: Record<string, unknown>,
  ) => Promise<void>;
}
