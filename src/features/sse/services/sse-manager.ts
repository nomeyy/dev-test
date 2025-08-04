import { logger } from "@/utils/logging";
import type {
  SSEClient,
  SSEEvent,
  SSEManagerConfig,
  ClientFilter,
  SSEStats,
} from "../types";

export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private pingInterval: NodeJS.Timeout | null = null;
  private totalEventsSent = 0;
  private lastEventTime?: number;

  private readonly config: Required<SSEManagerConfig>;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      pingInterval: config.pingInterval ?? 30000, // 30 seconds
      clientTimeout: config.clientTimeout ?? 60000, // 60 seconds
      maxClients: config.maxClients ?? 1000,
      enableLogging: config.enableLogging ?? true,
    };

    this.startPingInterval();
  }

  /**
   * Creates a new SSE connection for a client
   */
  createConnection(
    options: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Response {
    if (this.clients.size >= this.config.maxClients) {
      throw new Error("Maximum number of SSE clients reached");
    }

    const clientId = this.generateClientId();
    const encoder = new TextEncoder();

    let clientRef: SSEClient;

    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId: options.userId,
          sessionId: options.sessionId,
          response: new Response(),
          controller,
          lastPing: Date.now(),
          connectedAt: Date.now(),
          metadata: options.metadata,
        };

        clientRef = client;
        this.clients.set(clientId, client);

        if (this.config.enableLogging) {
          logger.info("SSE", "Client connected", {
            clientId,
            userId: options.userId,
            sessionId: options.sessionId,
            totalClients: this.clients.size,
          });
        }

        // Send initial connection event
        this.sendToClient(clientId, {
          event: "connected",
          data: { clientId, connectedAt: client.connectedAt },
        });
      },
      cancel: () => {
        this.disconnectClient(clientId);
      },
    });

    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });

    // Update the client reference with the actual response
    if (clientRef!) {
      clientRef.response = response;
    }

    return response;
  }

  /**
   * Sends an event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      if (this.config.enableLogging) {
        logger.warn("SSE", "Attempted to send event to non-existent client", {
          clientId,
          event: event.event,
        });
      }
      return false;
    }

    try {
      const message = this.formatSSEMessage(event);
      client.controller.enqueue(new TextEncoder().encode(message));
      this.totalEventsSent++;
      this.lastEventTime = Date.now();
      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        logger.error("SSE", "Failed to send event to client", {
          clientId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      this.disconnectClient(clientId);
      return false;
    }
  }

  /**
   * Sends an event to multiple clients based on filter criteria
   */
  sendToClients(filter: ClientFilter, event: SSEEvent): number {
    const matchingClients = this.getClientsByFilter(filter);
    let successCount = 0;

    for (const client of matchingClients) {
      if (this.sendToClient(client.id, event)) {
        successCount++;
      }
    }

    if (this.config.enableLogging && matchingClients.length > 0) {
      logger.info("SSE", "Broadcast event sent", {
        event: event.event,
        targetClients: matchingClients.length,
        successCount,
        filter,
      });
    }

    return successCount;
  }

  /**
   * Broadcasts an event to all connected clients
   */
  broadcast(event: SSEEvent): number {
    return this.sendToClients({}, event);
  }

  /**
   * Sends an event to all clients for a specific user
   */
  sendToUser(userId: string, event: SSEEvent): number {
    return this.sendToClients({ userId }, event);
  }

  /**
   * Disconnects a specific client
   */
  disconnectClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      client.controller.close();
    } catch (error) {
      // Controller might already be closed
    }

    this.clients.delete(clientId);

    if (this.config.enableLogging) {
      logger.info("SSE", "Client disconnected", {
        clientId,
        userId: client.userId,
        connectionDuration: Date.now() - client.connectedAt,
        totalClients: this.clients.size,
      });
    }

    return true;
  }

  /**
   * Disconnects all clients for a specific user
   */
  disconnectUser(userId: string): number {
    const userClients = this.getClientsByFilter({ userId });
    let disconnectedCount = 0;

    for (const client of userClients) {
      if (this.disconnectClient(client.id)) {
        disconnectedCount++;
      }
    }

    return disconnectedCount;
  }

  /**
   * Gets statistics about the SSE manager
   */
  getStats(): SSEStats {
    const clientsByUser: Record<string, number> = {};
    let totalConnectionDuration = 0;
    const now = Date.now();

    for (const client of this.clients.values()) {
      if (client.userId) {
        clientsByUser[client.userId] = (clientsByUser[client.userId] || 0) + 1;
      }
      totalConnectionDuration += now - client.connectedAt;
    }

    return {
      totalClients: this.clients.size,
      clientsByUser,
      averageConnectionDuration:
        this.clients.size > 0 ? totalConnectionDuration / this.clients.size : 0,
      totalEventsSent: this.totalEventsSent,
      lastEventTime: this.lastEventTime,
    };
  }

  /**
   * Gets all clients matching the filter criteria
   */
  private getClientsByFilter(filter: ClientFilter): SSEClient[] {
    const clients: SSEClient[] = [];

    for (const client of this.clients.values()) {
      if (filter.clientIds && !filter.clientIds.includes(client.id)) {
        continue;
      }

      if (filter.userId && client.userId !== filter.userId) {
        continue;
      }

      if (filter.sessionId && client.sessionId !== filter.sessionId) {
        continue;
      }

      if (filter.metadata) {
        const hasAllMetadata = Object.entries(filter.metadata).every(
          ([key, value]) => client.metadata?.[key] === value,
        );
        if (!hasAllMetadata) {
          continue;
        }
      }

      clients.push(client);
    }

    return clients;
  }

  /**
   * Formats an SSE event into the proper SSE message format
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);

    // Handle multi-line data
    const dataLines = data.split("\n");
    for (const line of dataLines) {
      message += `data: ${line}\n`;
    }

    message += "\n"; // Double newline to end the event

    return message;
  }

  /**
   * Generates a unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Starts the ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleClients();
    }, this.config.pingInterval);
  }

  /**
   * Sends heartbeat to all clients
   */
  private sendHeartbeat(): void {
    const now = Date.now();
    const heartbeatEvent: SSEEvent = {
      event: "ping",
      data: { timestamp: now },
    };

    for (const client of this.clients.values()) {
      if (this.sendToClient(client.id, heartbeatEvent)) {
        client.lastPing = now;
      }
    }
  }

  /**
   * Removes clients that haven't received a ping in a while
   */
  private cleanupStaleClients(): void {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > this.config.clientTimeout) {
        staleClients.push(clientId);
      }
    }

    for (const clientId of staleClients) {
      this.disconnectClient(clientId);
    }

    if (this.config.enableLogging && staleClients.length > 0) {
      logger.info("SSE", "Cleaned up stale clients", {
        staleClientCount: staleClients.length,
        remainingClients: this.clients.size,
      });
    }
  }

  /**
   * Gets all active connections with detailed information
   */
  getActiveConnections(): Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    connectedAt: number;
    connectionDuration: number;
    lastPing: number;
    timeSinceLastPing: number;
    metadata?: Record<string, unknown>;
  }> {
    const now = Date.now();
    const connections: Array<{
      id: string;
      userId?: string;
      sessionId?: string;
      connectedAt: number;
      connectionDuration: number;
      lastPing: number;
      timeSinceLastPing: number;
      metadata?: Record<string, unknown>;
    }> = [];

    for (const client of this.clients.values()) {
      connections.push({
        id: client.id,
        userId: client.userId,
        sessionId: client.sessionId,
        connectedAt: client.connectedAt,
        connectionDuration: now - client.connectedAt,
        lastPing: client.lastPing,
        timeSinceLastPing: now - client.lastPing,
        metadata: client.metadata,
      });
    }

    // Sort by connection time (newest first)
    return connections.sort((a, b) => b.connectedAt - a.connectedAt);
  }

  /**
   * Cleanup method to stop intervals and close all connections
   */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Disconnect all clients
    const clientIds = Array.from(this.clients.keys());
    for (const clientId of clientIds) {
      this.disconnectClient(clientId);
    }

    if (this.config.enableLogging) {
      logger.info("SSE", "Manager destroyed", {
        disconnectedClients: clientIds.length,
      });
    }
  }
}
