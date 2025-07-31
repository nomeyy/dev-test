import type { NextRequest } from "next/server";

/**
 * Represents a single SSE client connection
 */
export interface SSEClientConnection {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  connectedAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

/**
 * Represents a user's SSE connection status
 */
export interface UserSSEStatus {
  userId: string;
  activeConnections: number;
  lastSeen: Date;
  isOnline: boolean;
}

/**
 * SSE event types that can be sent to clients
 */
export type SSEEventType =
  | "user.online"
  | "user.offline"
  | "user.activity"
  | "notification"
  | "message"
  | "system.alert"
  | "custom";

/**
 * Base structure for SSE events
 */
export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: Date;
  id?: string;
}

/**
 * User-specific SSE event
 */
export interface UserSSEEvent extends SSEEvent {
  userId: string;
  targetConnectionIds?: string[];
}

/**
 * Broadcast SSE event to all connected users
 */
export interface BroadcastSSEEvent extends SSEEvent {
  excludeUserIds?: string[];
  excludeConnectionIds?: string[];
}

/**
 * SSE connection request context
 */
export interface SSEConnectionContext {
  request: NextRequest;
  userId: string;
  userAgent: string;
  ipAddress: string;
}

/**
 * SSE manager configuration options
 */
export interface SSEManagerConfig {
  maxConnectionsPerUser?: number;
  connectionTimeout?: number; // in milliseconds
  heartbeatInterval?: number; // in milliseconds
  cleanupInterval?: number; // in milliseconds
  enableLogging?: boolean;
}

/**
 * SSE manager statistics
 */
export interface SSEManagerStats {
  totalConnections: number;
  activeConnections: number;
  totalUsers: number;
  onlineUsers: number;
  connectionsByUser: Record<string, number>;
}

/**
 * SSE manager service interface
 */
export interface SSEManagerService {
  // Connection management
  addConnection(context: SSEConnectionContext): Promise<SSEClientConnection>;
  removeConnection(connectionId: string): Promise<void>;
  getConnection(connectionId: string): Promise<SSEClientConnection | null>;
  getUserConnections(userId: string): Promise<SSEClientConnection[]>;
  updateConnectionActivity(connectionId: string): Promise<void>;

  // User management
  getUserStatus(userId: string): Promise<UserSSEStatus>;
  getAllUserStatuses(): Promise<UserSSEStatus[]>;
  getOnlineUsers(): Promise<string[]>;

  // Event broadcasting
  sendToUser(userId: string, event: SSEEvent): Promise<void>;
  sendToConnection(connectionId: string, event: SSEEvent): Promise<void>;
  broadcast(event: BroadcastSSEEvent): Promise<void>;

  // Statistics and monitoring
  getStats(): Promise<SSEManagerStats>;
  cleanup(): Promise<void>;

  // Connection validation
  isConnectionActive(connectionId: string): Promise<boolean>;
  validateConnection(connectionId: string): Promise<boolean>;
}
