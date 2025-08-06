export interface SSEEvent {
  id?: string;
  event: string;
  data: unknown; // Changed from any to unknown for type safety
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  // The controller is used to directly manage the stream
  controller: ReadableStreamDefaultController;
  lastPing: number;
  isAlive: boolean;
}

// This new interface defines the return type for the addClient method
export interface SSEClientConnection {
  clientId: string;
  response: Response;
}

export interface SSEMessage {
  event: string;
  data: unknown; // Changed from any to unknown for type safety
  target?: "private" | "broadcast";
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

export interface SSEStats {
  totalConnections: number;
  activeConnections: number;
  privateConnections: number;
  broadcastConnections: number;
}

export type SSEEventType =
  | "report.generating"
  | "report.completed"
  | "report.failed"
  | "notification"
  | "ping"
  | "error"
  | "open"; // Added "open" event type

export interface ReportEvent {
  reportId: string;
  status: "generating" | "completed" | "failed";
  message: string;
  progress?: number;
  downloadUrl?: string;
  error?: string;
}
