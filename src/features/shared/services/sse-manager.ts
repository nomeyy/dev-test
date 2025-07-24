/**
 * Server-Sent Events (SSE) Manager
 * Centralized, reusable service for managing SSE connections and event dispatching.
 *
 * Features:
 * - Track active client connections (per user/session)
 * - Send named events with payloads to specific clients or broadcast
 * - Heartbeat/ping mechanism to keep connections alive
 * - Clean up on disconnect/errors
 * - API for backend modules to push events
 *
 * Usage:
 *   import { sseManager } from "@/features/shared/services";
 *   sseManager.sendEvent(clientId, "eventName", { foo: "bar" });
 *   sseManager.broadcast("eventName", { foo: "bar" });
 *
 * Backend modules can use these methods to push updates to clients.
 */
// Server-Sent Events (SSE) Manager
// Centralized, reusable service for managing SSE connections and event dispatching

import type { IncomingMessage, ServerResponse } from "http";
import type { NextApiRequest, NextApiResponse } from "next";

// Type for event payloads
type SSEPayload = Record<string, any>;

// Type for a connected client
interface SSEClient {
  id: string; // user/session id or unique identifier
  res: ServerResponse;
}

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_MS = 25000;

  /**
   * Add a new client connection.
   * @param id Unique client identifier (user/session ID)
   * @param res Node.js ServerResponse object
   */
  addClient(id: string, res: ServerResponse) {
    this.clients.set(id, { id, res });
    this.setupSSEHeaders(res);
    this.sendEvent(id, "connected", { message: "SSE connection established" });
    this.startHeartbeat();
  }

  /**
   * Remove a client connection and clean up resources.
   * @param id Unique client identifier
   */
  removeClient(id: string) {
    const client = this.clients.get(id);
    if (client) {
      try {
        client.res.end();
      } catch (e) {}
      this.clients.delete(id);
    }
    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  /**
   * Send a named event with JSON payload to a specific client.
   * @param id Client identifier
   * @param event Event name
   * @param data JSON payload
   */
  sendEvent(id: string, event: string, data: SSEPayload) {
    const client = this.clients.get(id);
    if (client) {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  /**
   * Broadcast a named event with JSON payload to all connected clients.
   * @param event Event name
   * @param data JSON payload
   */
  broadcast(event: string, data: SSEPayload) {
    for (const client of this.clients.values()) {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  // Setup SSE headers
  private setupSSEHeaders(res: ServerResponse) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders?.();
  }

  // Heartbeat to keep connections alive
  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        client.res.write(`event: ping\ndata: {}\n\n`);
      }
    }, this.HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clean up all client connections (e.g., on server shutdown)
   */
  closeAll() {
    for (const id of this.clients.keys()) {
      this.removeClient(id);
    }
  }
}

// Singleton instance for app-wide usage
export const sseManager = new SSEManager();
