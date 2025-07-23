import type { NextRequest } from "next/server";

/**
 * SSE Event types that can be sent to clients
 */
export type SSEEventType = 
  | "notification"
  | "user_update"
  | "reel_upload"
  | "search_result"
  | "system_message"
  | "heartbeat"
  | "ping";

/**
 * Base interface for all SSE events
 */
export interface SSEEvent {
  type: SSEEventType;
  id?: string;
  data: Record<string, any>;
  timestamp: number;
}

/**
 * Specific event interfaces for type safety
 */
export interface NotificationEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "notification";
  data: {
    title: string;
    message: string;
    level: "info" | "success" | "warning" | "error";
    actionUrl?: string;
  };
}

export interface UserUpdateEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "user_update";
  data: {
    userId: string;
    field: string;
    value: any;
  };
}

export interface ReelUploadEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "reel_upload";
  data: {
    reelId: string;
    status: "processing" | "completed" | "failed";
    progress?: number;
    error?: string;
  };
}

export interface SearchResultEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "search_result";
  data: {
    query: string;
    results: any[];
    total: number;
  };
}

export interface SystemMessageEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "system_message";
  data: {
    message: string;
    code?: string;
  };
}

export interface HeartbeatEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "heartbeat";
  data: {
    timestamp: number;
  };
}

export interface PingEvent extends Omit<SSEEvent, 'type' | 'data'> {
  type: "ping";
  data: {
    timestamp: number;
  };
}

/**
 * Union type for all specific event types
 */
export type SpecificSSEEvent = 
  | NotificationEvent
  | UserUpdateEvent
  | ReelUploadEvent
  | SearchResultEvent
  | SystemMessageEvent
  | HeartbeatEvent
  | PingEvent;

/**
 * Client connection information
 */
export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  connectedAt: number;
  lastActivity: number;
  channels: Set<string>;
  response: Response;
  controller: ReadableStreamDefaultController;
}

/**
 * SSE Manager interface
 */
export interface SSEManagerType {
  addClient(client: SSEClient): void;
  removeClient(clientId: string): void;
  getClient(clientId: string): SSEClient | undefined;
  getClientsByUser(userId: string): SSEClient[];
  getClientsByChannel(channel: string): SSEClient[];
  sendToClient(clientId: string, event: SSEEvent): boolean;
  sendToUser(userId: string, event: SSEEvent): boolean;
  sendToChannel(channel: string, event: SSEEvent): boolean;
  broadcast(event: SSEEvent): void;
  getActiveConnections(): number;
  cleanup(): void;
}

/**
 * SSE Service interface for backend integration
 */
export interface SSEServiceType {
  sendNotification(userId: string, title: string, message: string, level?: "info" | "success" | "warning" | "error", actionUrl?: string): Promise<boolean>;
  sendUserUpdate(userId: string, field: string, value: any): Promise<boolean>;
  sendReelUpdate(userId: string, reelId: string, status: "processing" | "completed" | "failed", progress?: number, error?: string): Promise<boolean>;
  sendSearchResult(userId: string, query: string, results: any[], total: number): Promise<boolean>;
  sendSystemMessage(userId: string, message: string, code?: string): Promise<boolean>;
  sendToChannel(channel: string, event: SSEEvent): Promise<boolean>;
  broadcast(event: SSEEvent): Promise<void>;
}

/**
 * Configuration for SSE connections
 */
export interface SSEConfig {
  heartbeatInterval: number; // milliseconds
  maxConnections: number;
  connectionTimeout: number; // milliseconds
  enableRedis: boolean;
  redisChannel: string;
}

/**
 * Request context for SSE connections
 */
export interface SSERequestContext {
  request: NextRequest;
  userId?: string;
  sessionId?: string;
  channels?: string[];
}

/**
 * Redis message format for cross-instance communication
 */
export interface SSERedisMessage {
  type: "sse_event";
  target: "user" | "channel" | "broadcast";
  targetId?: string;
  event: SSEEvent;
  timestamp: number;
  instanceId: string;
} 