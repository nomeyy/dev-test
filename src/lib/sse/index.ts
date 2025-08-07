// lib/sse/index.ts
export { default as sseManager } from "./manager";
export {
  sendToClient,
  broadcast,
  getClientCount,
  sendNotification,
} from "./sendEvent";

// Type definitions for SSE events
export interface SSEEvent {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface SSENotification {
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
  id: string;
}

export interface SSEConnection {
  id: string;
  timestamp: number;
  message: string;
}
