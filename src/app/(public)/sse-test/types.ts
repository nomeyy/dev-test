export interface SSEEvent {
  type: string;
  data: any;
  timestamp?: string;
  id?: string;
}

export interface SSEStats {
  totalClients: number;
  totalUsers: number;
  totalSessions: number;
  uptime: number;
  heartbeatEnabled: boolean;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  totalHeartbeatsSent: number;
  totalHeartbeatsReceived: number;
  lastHeartbeat?: Date;
  activeHeartbeats: number;
}

export type SendTarget = "client" | "user" | "session" | "broadcast";
