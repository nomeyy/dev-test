export interface SSEClient {
  connectionId: string;
  clientId: string;
  userId?: string;
  sessionId?: string;
  role?: string;
  connectionTime: Date;
  lastActivity: Date;
  isAlive: boolean;
  send: (data: string) => void;
  close: () => void;
}

export interface SSEEvent<T = any> {
  id?: string;
  event: string;
  data: T;
  retry?: number;
  timestamp: Date;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  heartbeatInterval?: number;
  maxRetries?: number;
  role?: string;
}

export interface SSEManagerConfig {
  heartbeatInterval: number;
  maxConnections: number;
  connectionTimeout: number;
  cleanupInterval: number;
}

export interface SSENotificationTarget {
  userId?: string;
  sessionId?: string;
  clientId?: string;
  connectionId?: string;
  broadcast?: boolean;
}

export interface SSENotification {
  event: string;
  data: any;
  target: SSENotificationTarget;
  priority?: 'low' | 'normal' | 'high';
}

export interface SSEMetrics {
  totalConnections: number;
  activeConnections: number;
  totalEventsSent: number;
  totalErrors: number;
  lastCleanup: Date;
}

export type SSEEventHandler<T = any> = (event: SSEEvent<T>) => void;
export type SSEConnectionHandler = (client: SSEClient) => void;
export type SSEDisconnectionHandler = (clientId: string, reason: string) => void;
