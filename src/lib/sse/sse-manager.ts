import { NextRequest } from "next/server";

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  response: Response;
  controller: ReadableStreamDefaultController;
  lastHeartbeat: number;
  metadata?: Record<string, any>;
  isClosed: boolean; // Add state tracking
}

export interface SSEEvent {
  event: string;
  data: any;
  id?: string;
  retry?: number;
}

export interface SSEMessage {
  event: string;
  data: any;
  target?: "all" | "user" | "session" | "client";
  targetId?: string;
  metadata?: Record<string, any>;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 120000; // 2 minutes
  private readonly CONNECTION_RATE_LIMIT = 1000; // 1 second between connections per user
  private lastConnections: Map<string, number> = new Map(); // Track last connection time per user

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Register a new SSE client connection
   */
  async registerClient(
    request: NextRequest,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>,
  ): Promise<Response> {
    // Rate limiting: prevent rapid reconnections
    if (userId) {
      const lastConnection = this.lastConnections.get(userId);
      const now = Date.now();
      if (lastConnection && now - lastConnection < this.CONNECTION_RATE_LIMIT) {
        console.log(
          `Rate limiting connection for user ${userId} (too frequent)`,
        );
        return new Response("Rate limited: too many connections", {
          status: 429,
        });
      }
      this.lastConnections.set(userId, now);
    }

    const clientId = this.generateClientId();

    try {
      // Create SSE response stream
      const stream = new ReadableStream({
        start: (controller) => {
          const client: SSEClient = {
            id: clientId,
            userId,
            sessionId,
            response: new Response(null, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
              },
            }),
            controller,
            lastHeartbeat: Date.now(),
            metadata,
            isClosed: false, // Initialize state
          };

          this.clients.set(clientId, client);

          // Send initial connection event
          this.sendToClient(clientId, {
            event: "connected",
            data: { clientId, timestamp: Date.now() },
          });

          console.log(`SSE Client connected: ${clientId}`, {
            userId,
            sessionId,
            totalClients: this.clients.size,
          });
        },
        cancel: (reason) => {
          // Only handle cancellation if client is still in our map and not already closed
          const client = this.clients.get(clientId);
          if (client && !client.isClosed) {
            console.log(`SSE Client stream cancelled: ${clientId}`, { reason });
            this.removeClient(clientId);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
          "X-Accel-Buffering": "no", // Disable nginx buffering
        },
      });
    } catch (error) {
      console.error(`Error creating SSE stream for client ${clientId}:`, error);
      return new Response("SSE stream creation failed", { status: 500 });
    }
  }

  /**
   * Send event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`SSE Client not found: ${clientId}`);
      return false;
    }

    // Check if client is already closed
    if (client.isClosed) {
      console.warn(`SSE Client already closed: ${clientId}`);
      this.clients.delete(clientId); // Clean up the reference
      return false;
    }

    try {
      const sseMessage = this.formatSSEMessage(event);
      client.controller.enqueue(new TextEncoder().encode(sseMessage));
      return true;
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send event to all clients
   */
  broadcast(event: SSEEvent): number {
    let sentCount = 0;
    const clientIds = Array.from(this.clients.keys());

    for (const clientId of clientIds) {
      if (this.sendToClient(clientId, event)) {
        sentCount++;
      }
    }

    console.log(
      `SSE Broadcast sent to ${sentCount}/${clientIds.length} clients`,
    );
    return sentCount;
  }

  /**
   * Send event to specific user's clients
   */
  sendToUser(userId: string, event: SSEEvent): number {
    let sentCount = 0;
    const userClients = Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );

    for (const client of userClients) {
      if (this.sendToClient(client.id, event)) {
        sentCount++;
      }
    }

    console.log(`SSE Event sent to ${sentCount} clients for user: ${userId}`);
    return sentCount;
  }

  /**
   * Send event to specific session's clients
   */
  sendToSession(sessionId: string, event: SSEEvent): number {
    let sentCount = 0;
    const sessionClients = Array.from(this.clients.values()).filter(
      (client) => client.sessionId === sessionId,
    );

    for (const client of sessionClients) {
      if (this.sendToClient(client.id, event)) {
        sentCount++;
      }
    }

    console.log(
      `SSE Event sent to ${sentCount} clients for session: ${sessionId}`,
    );
    return sentCount;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Check if already closed
    if (client.isClosed) {
      console.warn(`SSE Client already removed: ${clientId}`);
      this.clients.delete(clientId);
      return true;
    }

    try {
      // Try to close the controller, but don't throw if it's already closed
      try {
        client.controller.close();
      } catch (closeError) {
        // Controller might already be closed, that's okay
        console.log(
          `Controller already closed for client ${clientId}:`,
          closeError instanceof Error ? closeError.message : String(closeError),
        );
      }

      client.isClosed = true; // Mark as closed
      this.clients.delete(clientId);

      console.log(`SSE Client disconnected: ${clientId}`, {
        totalClients: this.clients.size,
      });
      return true;
    } catch (error) {
      console.error(`Error removing client ${clientId}:`, error);
      // Even if close fails, mark as closed and remove from map
      client.isClosed = true;
      this.clients.delete(clientId);
      return false;
    }
  }

  /**
   * Update client heartbeat
   */
  updateClientHeartbeat(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.isClosed) {
      return false;
    }

    client.lastHeartbeat = Date.now();
    return true;
  }

  /**
   * Get client statistics
   */
  getStats() {
    const clients = Array.from(this.clients.values());
    const userStats = new Map<string, number>();
    const sessionStats = new Map<string, number>();

    clients.forEach((client) => {
      if (client.userId) {
        userStats.set(client.userId, (userStats.get(client.userId) || 0) + 1);
      }
      if (client.sessionId) {
        sessionStats.set(
          client.sessionId,
          (sessionStats.get(client.sessionId) || 0) + 1,
        );
      }
    });

    return {
      totalClients: this.clients.size,
      uniqueUsers: userStats.size,
      uniqueSessions: sessionStats.size,
      userConnections: Object.fromEntries(userStats),
      sessionConnections: Object.fromEntries(sessionStats),
    };
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Send heartbeat to all clients
   */
  private sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      event: "heartbeat",
      data: { timestamp: Date.now() },
    };

    this.broadcast(heartbeatEvent);
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleClients = Array.from(this.clients.entries()).filter(
      ([_, client]) =>
        !client.isClosed && now - client.lastHeartbeat > this.CLIENT_TIMEOUT,
    );

    staleClients.forEach(([clientId, _]) => {
      console.log(`Removing stale SSE client: ${clientId}`);
      this.removeClient(clientId);
    });

    // Clean up old rate limit entries
    const oldRateLimitEntries = Array.from(
      this.lastConnections.entries(),
    ).filter(
      ([_, timestamp]) => now - timestamp > this.CONNECTION_RATE_LIMIT * 10, // Keep for 10x rate limit duration
    );
    oldRateLimitEntries.forEach(([userId, _]) => {
      this.lastConnections.delete(userId);
    });
  }

  /**
   * Format SSE message according to SSE specification
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    message += `event: ${event.event}\n`;
    message += `data: ${JSON.stringify(event.data)}\n\n`;

    return message;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    console.log("Shutting down SSE Manager...");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections gracefully
    const clientIds = Array.from(this.clients.keys());
    console.log(`Closing ${clientIds.length} SSE connections...`);

    clientIds.forEach((clientId) => {
      try {
        this.removeClient(clientId);
      } catch (error) {
        console.error(`Error closing client ${clientId}:`, error);
      }
    });

    console.log("SSE Manager shutdown complete");
  }
}

// Singleton instance
export const sseManager = new SSEManager();

// Cleanup on process exit
process.on("SIGTERM", () => {
  sseManager.destroy();
});

process.on("SIGINT", () => {
  sseManager.destroy();
});
