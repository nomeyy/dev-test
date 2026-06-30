import { z } from "zod";

// SSE Event Types
export const SSEEventSchema = z.object({
  id: z.string().optional(),
  event: z.string(),
  data: z.union([z.string(), z.record(z.unknown())]),
  retry: z.number().optional(),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// Connection Types
export interface SSEConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  stream: ReadableStream;
  controller: ReadableStreamDefaultController<string>;
  isAlive: boolean;
  lastHeartbeat: Date;
  connectedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionsByUser: Map<string, number>;
  averageConnectionDuration: number;
}

// SSE Service Configuration
export interface SSEConfig {
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
  maxConnectionsPerUser: number;
  maxTotalConnections: number;
  retryInterval: number; // milliseconds
  pingMessage: string;
}

// Event Broadcasting Options
export interface BroadcastOptions {
  targetUsers?: string[];
  excludeUsers?: string[];
  targetSessions?: string[];
  excludeSessions?: string[];
  targetConnections?: string[];
  excludeConnections?: string[];
}

// Channel Types
export const ChannelSchema = z.enum([
  "global", // Global notifications
  "user", // User-specific notifications
  "session", // Session-specific notifications
  "custom", // Custom channels
]);

export type Channel = z.infer<typeof ChannelSchema>;

// Event Names (extensible)
export const EventNameSchema = z.enum([
  "ping",
  "notification",
  "user_update",
  "system_message",
  "data_sync",
  "custom",
]);

export type EventName = z.infer<typeof EventNameSchema>;

// SSE Service Interface
export interface SSEServiceType {
  // Connection Management
  createConnection(
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, string>,
  ): Promise<{ connection: SSEConnection; stream: ReadableStream }>;

  closeConnection(connectionId: string): Promise<boolean>;

  getConnection(connectionId: string): Promise<SSEConnection | null>;

  getConnectionsByUser(userId: string): Promise<SSEConnection[]>;

  getConnectionsBySession(sessionId: string): Promise<SSEConnection[]>;

  // Event Broadcasting
  sendToConnection(connectionId: string, event: SSEEvent): Promise<boolean>;

  sendToUser(
    userId: string,
    event: SSEEvent,
    options?: BroadcastOptions,
  ): Promise<number>; // returns number of connections message was sent to

  sendToSession(
    sessionId: string,
    event: SSEEvent,
    options?: BroadcastOptions,
  ): Promise<number>;

  broadcast(event: SSEEvent, options?: BroadcastOptions): Promise<number>;

  // Channel Management
  subscribeToChannel(connectionId: string, channel: string): Promise<boolean>;

  unsubscribeFromChannel(
    connectionId: string,
    channel: string,
  ): Promise<boolean>;

  sendToChannel(
    channel: string,
    event: SSEEvent,
    options?: BroadcastOptions,
  ): Promise<number>;

  // Health & Monitoring
  getConnectionMetrics(): Promise<ConnectionMetrics>;

  cleanupStaleConnections(): Promise<number>;

  startHeartbeat(): void;

  stopHeartbeat(): void;
}

// Redis Channel Names (for pub/sub)
export const REDIS_CHANNELS = {
  SSE_EVENTS: "sse:events",
  SSE_USER_EVENTS: "sse:user",
  SSE_SESSION_EVENTS: "sse:session",
  SSE_CHANNEL_EVENTS: "sse:channel",
  SSE_HEARTBEAT: "sse:heartbeat",
  SSE_CONNECTION_CLEANUP: "sse:cleanup",
} as const;

// Redis Keys
export const REDIS_KEYS = {
  CONNECTIONS: "sse:connections",
  USER_CONNECTIONS: "sse:user_connections",
  SESSION_CONNECTIONS: "sse:session_connections",
  CHANNEL_SUBSCRIPTIONS: "sse:channel_subs",
  CONNECTION_METRICS: "sse:metrics",
} as const;

// Error Types
export class SSEError extends Error {
  constructor(
    message: string,
    public code: string,
    public connectionId?: string,
  ) {
    super(message);
    this.name = "SSEError";
  }
}

// Utility Types
export type SSEEventHandler = (
  event: SSEEvent,
  connectionId: string,
) => Promise<void>;
export type ConnectionEventHandler = (
  connection: SSEConnection,
) => Promise<void>;
