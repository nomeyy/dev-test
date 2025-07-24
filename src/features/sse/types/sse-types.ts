/**
 * SSE Client interface representing a connected client
 */
export interface SSEClient {
  id: string;
  userId?: string;
  sessionId: string;
  connectionTime: Date;
  lastHeartbeat: Date;
  isConnected: boolean;
  userAgent?: string;
  ipAddress?: string;
  groups: Set<string>;
  roles?: string[]; // <-- add roles for RBAC
  state?: SSEConnectionState;
}

/**
 * SSE Event interface for event structure
 */
export interface SSEEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: Date;
  target?: {
    userId?: string;
    clientId?: string;
    groups?: string[];
  };
  metadata?: {
    source?: string;
    priority?: "low" | "normal" | "high";
    ttl?: number; // Time to live in seconds
    roles?: string[]; // <-- add roles for RBAC
  };
}

/**
 * SSE Manager configuration interface
 */
export interface SSEManagerConfig {
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
  maxConnections: number;
  enableRedis: boolean;
  redisChannel?: string;
  enableLogging: boolean;
  enableMetrics: boolean;
}

/**
 * SSE Manager service contract interface
 */
export interface SSEManagerType {
  // Connection management
  connectClient(
    client: Omit<SSEClient, "connectionTime" | "lastHeartbeat" | "isConnected">,
  ): Promise<void>;
  disconnectClient(clientId: string): Promise<void>;
  getClient(clientId: string): SSEClient | undefined;
  getConnectedClients(): SSEClient[];
  getClientsByUser(userId: string): SSEClient[];
  getClientsByGroup(group: string): SSEClient[];

  // Event broadcasting
  sendEventToClient(
    clientId: string,
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void>;
  sendEventToUser(
    userId: string,
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void>;
  sendEventToGroup(
    group: string,
    event: Omit<SSEEvent, "id" | "timestamp">,
  ): Promise<void>;
  broadcastEvent(event: Omit<SSEEvent, "id" | "timestamp">): Promise<void>;

  // Heartbeat management
  updateHeartbeat(clientId: string): Promise<void>;
  cleanupStaleConnections(): Promise<void>;

  // Statistics and monitoring
  getConnectionCount(): number;
  getStats(): SSEManagerStats;

  // Lifecycle
  shutdown(): Promise<void>;
}

/**
 * SSE Manager statistics interface
 */
export interface SSEManagerStats {
  totalConnections: number;
  activeConnections: number;
  totalEventsSent: number;
  eventsSentToday: number;
  averageEventLatency: number;
  uptime: number;
  lastCleanup: Date;
  errorCount?: number;
  lastError?: string | null;
}

/**
 * SSE Connection state enum
 */
export enum SSEConnectionState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

/**
 * SSE Event priority enum
 */
export enum SSEEventPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
}
