import { z } from "zod";

export const SseEventEnvelope = z.object({
  event: z.string().min(1),
  data: z.any(),
  id: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  topic: z.string().optional(),
  timestamp: z.number().optional(),
  retry: z.number().optional(),
});
export type SseEventEnvelope = z.infer<typeof SseEventEnvelope>;

export type Target =
  | { type: "broadcast" }
  | { type: "user"; userId: string }
  | { type: "session"; sessionId: string }
  | { type: "topic"; topic: string };

export interface ConnectionInfo {
  connId: string;
  userId?: string;
  sessionId?: string;
  topics: string[];
  connectedAt: number;
  lastActivity: number;
  userAgent?: string;
  ip?: string;
}

export interface SseError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface SseStats {
  totalConnections: number;
  activeConnections: number;
  totalEventsSent: number;
  totalErrors: number;
  uptime: number;
  connectionsByUser: Record<string, number>;
  connectionsByTopic: Record<string, number>;
}
