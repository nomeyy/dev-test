/**
 * Service interfaces for SSE feature components
 */

import type {
  SSEConnection,
  SSEEvent,
  SSEConnectionMetadata,
  SSETarget,
  HeartbeatConfig,
} from "../types";

/**
 * Main SSE connection manager interface
 */
export interface SSEManager {
  addConnection(connection: SSEConnection): Promise<void>;
  removeConnection(connectionId: string): Promise<void>;
  sendToUser(userId: string, event: SSEEvent): Promise<boolean>;
  sendToSession(sessionId: string, event: SSEEvent): Promise<boolean>;
  sendToClient(clientId: string, event: SSEEvent): Promise<boolean>;
  broadcast(event: SSEEvent): Promise<number>;
  sendHeartbeat(connectionId: string): Promise<boolean>;
  sendError(connectionId: string, error: Error): Promise<boolean>;
  getActiveConnections(): Promise<SSEConnection[]>;
  cleanup(): Promise<void>;
}

/**
 * High-level SSE service API interface
 */
export interface SSEServiceAPI {
  notifyUser(userId: string, eventName: string, payload: any): Promise<boolean>;
  notifySession(
    sessionId: string,
    eventName: string,
    payload: any,
  ): Promise<boolean>;
  broadcastEvent(eventName: string, payload: any): Promise<number>;
  sendCustomEvent(target: SSETarget, event: SSEEvent): Promise<boolean>;
}

/**
 * Heartbeat manager interface
 */
export interface HeartbeatManager {
  startHeartbeat(connectionId: string): void;
  stopHeartbeat(connectionId: string): void;
  updateLastPing(connectionId: string): void;
  cleanupStaleConnections(): Promise<string[]>;
}

/**
 * Connection store interface for Redis operations
 */
export interface ConnectionStore {
  storeConnection(connection: SSEConnectionMetadata): Promise<void>;
  getConnection(connectionId: string): Promise<SSEConnectionMetadata | null>;
  getUserConnections(userId: string): Promise<SSEConnectionMetadata[]>;
  getSessionConnections(sessionId: string): Promise<SSEConnectionMetadata[]>;
  removeConnection(connectionId: string): Promise<void>;
  getAllConnections(): Promise<SSEConnectionMetadata[]>;
  updateLastActivity(connectionId: string): Promise<void>;
  getUserConnectionCount(userId: string): Promise<number>;
  getSessionConnectionCount(sessionId: string): Promise<number>;
  cleanupStaleConnections(maxAgeMs: number): Promise<string[]>;
}
