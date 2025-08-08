import type { ReadableStreamDefaultController } from "stream/web";

/**
 * SSE Event types that can be sent to clients
 */
export type SSEEventType =
  | "connected"
  | "ping"
  | "notification"
  | "error"
  | "custom";

/**
 * Base structure for SSE event data
 */
export interface SSEEventData {
  timestamp: string;
  [key: string]: unknown;
}

/**
 * SSE Event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data: SSEEventData;
  id?: string;
}

/**
 * Client connection information
 */
export interface SSEClient {
  userId: string;
  clientId: string;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * Options for sending events
 */
export interface SendEventOptions {
  eventType: SSEEventType;
  data: SSEEventData;
  eventId?: string;
  targetUsers?: string[];
  broadcast?: boolean;
}

/**
 * SSE Manager interface
 */
export interface SSEManager {
  registerClient(
    userId: string,
    clientId: string,
    controller: ReadableStreamDefaultController,
  ): SSEClient;
  removeClient(userId: string, clientId: string): boolean;
  sendEvent(options: SendEventOptions): Promise<void>;
  sendToUser(
    userId: string,
    eventType: SSEEventType,
    data: SSEEventData,
    eventId?: string,
  ): Promise<void>;
  broadcast(
    eventType: SSEEventType,
    data: SSEEventData,
    eventId?: string,
  ): Promise<void>;
  getActiveConnections(): Map<string, SSEClient[]>;
  getConnectionCount(): number;
  cleanup(): void;
}

/**
 * SSE Service interface for backend integration
 */
export interface SSEService {
  sendNotification(
    userId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  sendCustomEvent(
    userId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  broadcastNotification(
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
}
