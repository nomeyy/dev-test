import { z } from "zod";

// SSE Event Types
export const SSEEventSchema = z.object({
  id: z.string(),
  event: z.string(),
  data: z.record(z.any()),
  timestamp: z.number(),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// SSE Client Connection
export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  controller: AbortController;
  lastPing: number;
  connectedAt: number;
  metadata?: Record<string, any>;
}

// SSE Connection Manager Types
export interface SSEConnectionManager {
  connect(client: SSEClient): Promise<void>;
  disconnect(clientId: string): Promise<void>;
  send(clientId: string, event: SSEEvent): Promise<boolean>;
  sendToUser(userId: string, event: SSEEvent): Promise<number>;
  sendToSession(sessionId: string, event: SSEEvent): Promise<number>;
  broadcast(event: SSEEvent): Promise<number>;
  getActiveClients(): SSEClient[];
  getClientCount(): number;
  cleanup(): Promise<void>;
}

// Heartbeat configuration
export interface HeartbeatConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  maxMissedPings: number;
}

// SSE Event payload types
export const SSENotificationEventSchema = z.object({
  type: z.enum(["notification", "alert", "update", "system"]),
  title: z.string().optional(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type SSENotificationEvent = z.infer<typeof SSENotificationEventSchema>;

// Service options
export interface SSEServiceOptions {
  heartbeat?: HeartbeatConfig;
  maxConnections?: number;
  connectionTimeout?: number;
  enableLogging?: boolean;
}

// Default configurations
export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  interval: 30000, // 30 seconds
  timeout: 60000, // 1 minute
  maxMissedPings: 3,
};

export const DEFAULT_SSE_OPTIONS: SSEServiceOptions = {
  heartbeat: DEFAULT_HEARTBEAT_CONFIG,
  maxConnections: 1000,
  connectionTimeout: 300000, // 5 minutes
  enableLogging: true,
};

// Utility types for backend integration
export interface SSEServiceType {
  sendNotification(
    userId: string,
    notification: SSENotificationEvent,
  ): Promise<boolean>;
  sendAlert(
    userId: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean>;
  sendUpdate(
    userId: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean>;
  sendSystemMessage(
    message: string,
    data?: Record<string, any>,
  ): Promise<number>;
  getConnectionStats(): {
    activeConnections: number;
    totalConnections: number;
    uptime: number;
  };
}
