export interface SSEConnection {
  id: string;
  userId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface SSEEvent {
  id?: string;
  type: string;
  data: string | Record<string, unknown>;
  timestamp?: Date;
}

export interface SSEConnectionOptions {
  userId?: string;
}

export interface SSEBroadcastOptions {
  userIds?: string[];
  excludeConnectionIds?: string[];
}

export interface SSEStats {
  totalConnections: number;
  activeConnections: number;
  eventsSent: number;
}

export interface SSEUserStats {
  userId: string;
  activeConnections: number;
  lastConnectionAt?: Date;
}
