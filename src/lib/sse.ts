import { type NextRequest } from "next/server";

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  metadata?: Record<string, any>;
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
  userId?: string;
  sessionId?: string;
  clientId?: string;
  broadcast?: boolean;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 120000; // 2 minutes
  private readonly MAX_CLIENTS = 1000; // Maximum number of concurrent clients
  private readonly MAX_CLIENTS_PER_USER = 5; // Maximum connections per user

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Register a new SSE client connection
   */
  public registerClient(
    request: NextRequest,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>,
  ): Response {
    // Check if we've reached the maximum number of clients
    if (this.clients.size >= this.MAX_CLIENTS) {
      console.warn(`SSE: Maximum client limit reached (${this.MAX_CLIENTS})`);
      return new Response("Server at capacity", { status: 503 });
    }

    // Check if user has too many connections
    if (userId) {
      const userConnections = Array.from(this.clients.values()).filter(
        (client) => client.userId === userId,
      ).length;

      if (userConnections >= this.MAX_CLIENTS_PER_USER) {
        console.warn(
          `SSE: User ${userId} has too many connections (${userConnections})`,
        );
        return new Response("Too many connections for user", { status: 429 });
      }
    }

    const clientId = this.generateClientId();

    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId,
          sessionId,
          controller,
          lastPing: Date.now(),
          metadata,
        };

        this.clients.set(clientId, client);
        console.log(
          `SSE: Client ${clientId} connected (User: ${userId}, Session: ${sessionId}) - Total clients: ${this.clients.size}`,
        );

        // Send initial connection event
        this.sendEventToClient(clientId, {
          event: "connected",
          data: { clientId, timestamp: Date.now() },
        });

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          this.removeClient(clientId);
        });
      },
      cancel: () => {
        this.removeClient(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "X-Accel-Buffering": "no", // Disable proxy buffering
      },
    });
  }

  /**
   * Send an event to a specific client
   */
  public sendEventToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`SSE: Client ${clientId} not found`);
      return false;
    }

    try {
      const message = this.formatSSEMessage(event);
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      client.controller.enqueue(data);
      client.lastPing = Date.now();
      return true;
    } catch (error) {
      console.error(`SSE: Error sending event to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send an event to all clients matching criteria
   */
  public sendEventToClients(message: SSEMessage): number {
    const { event, data, userId, sessionId, clientId, broadcast } = message;
    let sentCount = 0;

    for (const [id, client] of this.clients) {
      let shouldSend = false;

      if (broadcast) {
        shouldSend = true;
      } else if (clientId && id === clientId) {
        shouldSend = true;
      } else if (userId && client.userId === userId) {
        shouldSend = true;
      } else if (sessionId && client.sessionId === sessionId) {
        shouldSend = true;
      }

      if (shouldSend) {
        if (this.sendEventToClient(id, { event, data })) {
          sentCount++;
        }
      }
    }

    console.log(`SSE: Sent event "${event}" to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Broadcast an event to all connected clients
   */
  public broadcastEvent(event: string, data: any): number {
    return this.sendEventToClients({
      event,
      data,
      broadcast: true,
    });
  }

  /**
   * Send event to specific user
   */
  public sendEventToUser(userId: string, event: string, data: any): number {
    return this.sendEventToClients({
      event,
      data,
      userId,
    });
  }

  /**
   * Send event to specific session
   */
  public sendEventToSession(
    sessionId: string,
    event: string,
    data: any,
  ): number {
    return this.sendEventToClients({
      event,
      data,
      sessionId,
    });
  }

  /**
   * Remove a client from the connection pool
   */
  public removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      client.controller.close();
      this.clients.delete(clientId);
      console.log(
        `SSE: Client ${clientId} disconnected - Total clients: ${this.clients.size}`,
      );
      return true;
    } catch (error) {
      console.error(`SSE: Error removing client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Get client statistics
   */
  public getStats() {
    const totalClients = this.clients.size;
    const userClients = new Set(
      Array.from(this.clients.values())
        .map((client) => client.userId)
        .filter(Boolean),
    ).size;
    const sessionClients = new Set(
      Array.from(this.clients.values())
        .map((client) => client.sessionId)
        .filter(Boolean),
    ).size;

    return {
      totalClients,
      uniqueUsers: userClients,
      uniqueSessions: sessionClients,
      maxClients: this.MAX_CLIENTS,
      maxClientsPerUser: this.MAX_CLIENTS_PER_USER,
      clients: Array.from(this.clients.values()).map((client) => ({
        id: client.id,
        userId: client.userId,
        sessionId: client.sessionId,
        lastPing: client.lastPing,
        metadata: client.metadata,
      })),
    };
  }

  /**
   * Clean up inactive clients
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const inactiveClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (now - client.lastPing > this.CLIENT_TIMEOUT) {
        inactiveClients.push(clientId);
      }
    }

    if (inactiveClients.length > 0) {
      console.log(`SSE: Removing ${inactiveClients.length} inactive clients`);
      inactiveClients.forEach((clientId) => {
        this.removeClient(clientId);
      });
    }
  }

  /**
   * Send heartbeat to all clients
   */
  private sendHeartbeat(): void {
    this.broadcastEvent("ping", { timestamp: Date.now() });
  }

  /**
   * Start the heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupInactiveClients();
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop the heartbeat mechanism
   */
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Format SSE message according to the SSE specification
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
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all connections (for shutdown)
   */
  public cleanup(): void {
    this.stopHeartbeat();
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }
  }
}

// Export a singleton instance
export const sseManager = new SSEManager();

// Utility functions for easy integration
export const SSE = {
  /**
   * Send event to all connected clients
   */
  broadcast: (event: string, data: any) =>
    sseManager.broadcastEvent(event, data),

  /**
   * Send event to specific user
   */
  toUser: (userId: string, event: string, data: any) =>
    sseManager.sendEventToUser(userId, event, data),

  /**
   * Send event to specific session
   */
  toSession: (sessionId: string, event: string, data: any) =>
    sseManager.sendEventToSession(sessionId, event, data),

  /**
   * Send event to specific client
   */
  toClient: (clientId: string, event: string, data: any) =>
    sseManager.sendEventToClient(clientId, { event, data }),

  /**
   * Get connection statistics
   */
  getStats: () => sseManager.getStats(),
};
