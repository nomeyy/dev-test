export interface SSEEvent {
  type: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface SSEConnection {
  userId: string;
  connectionId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  userAgent?: string;
  clientIp?: string;
}

export interface SSEManager {
  addConnection(
    userId: string,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    metadata?: Partial<SSEConnection>,
  ): string;
  removeConnection(connectionId: string): boolean;
  getUserConnections(userId: string): SSEConnection[];
  getAllConnections(): SSEConnection[];
  sendToConnection(connectionId: string, event: SSEEvent): Promise<boolean>;
  sendToUser(userId: string, event: SSEEvent): Promise<number>;
  broadcast(event: SSEEvent): Promise<number>;
  sendHeartbeat(connectionId?: string): Promise<void>;
  cleanup(): number;
}

export interface SSEManagerConfig {
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConnectionsPerUser: number;
  enableCleanup: boolean;
  cleanupInterval: number;
}

export enum SSEEventType {
  HEARTBEAT = "heartbeat",
  USER_NOTIFICATION = "user_notification",
  SYSTEM_ALERT = "system_alert",
  UPLOAD_PROGRESS = "upload_progress",
  UPLOAD_COMPLETE = "upload_complete",
  CONNECTION_STATUS = "connection_status",
  CUSTOM = "custom",
}

export interface HeartbeatEventData {
  timestamp: number;
  connectionId: string;
}

export interface NotificationEventData {
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  timestamp: number;
}

export interface UploadProgressEventData {
  uploadId: string;
  progress: number; // 0-100
  status: "uploading" | "processing" | "complete" | "error";
  message?: string;
}

export interface ConnectionStatusEventData {
  status: "connected" | "disconnected" | "error";
  connectionId: string;
  timestamp: number;
  reason?: string;
}

export type EventDataMap = {
  [SSEEventType.HEARTBEAT]: HeartbeatEventData;
  [SSEEventType.USER_NOTIFICATION]: NotificationEventData;
  [SSEEventType.SYSTEM_ALERT]: NotificationEventData;
  [SSEEventType.UPLOAD_PROGRESS]: UploadProgressEventData;
  [SSEEventType.UPLOAD_COMPLETE]: { uploadId: string; assetId?: string };
  [SSEEventType.CONNECTION_STATUS]: ConnectionStatusEventData;
  [SSEEventType.CUSTOM]: Record<string, unknown>;
};

export interface SSEService {
  notifyUser(
    userId: string,
    notification: NotificationEventData,
  ): Promise<boolean>;
  broadcastAlert(alert: NotificationEventData): Promise<number>;
  updateUploadProgress(
    userId: string,
    progress: UploadProgressEventData,
  ): Promise<boolean>;
  sendCustomEvent<T = Record<string, unknown>>(
    userId: string | null,
    eventType: string,
    data: T,
  ): Promise<number>;
  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    connectionsPerUser: Record<string, number>;
  };
}
