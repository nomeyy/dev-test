import type {
  SSEClient,
  SSEEvent,
  SSEEventPayload,
  SSEBroadcastOptions,
  SSEConnectionStats,
  SSEError,
  SSEManagerConfig,
} from "../types";
import { SSEErrorType } from "../types";

/**
 * Centralized SSE Manager for handling real-time server-to-client notifications
 */
export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEManagerConfig>;
  private stats: SSEConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalEventsSent: 0,
    totalBroadcasts: 0,
  };

  constructor(config: SSEManagerConfig = {}) {
    // Get NODE_ENV safely
    const nodeEnv =
      typeof process !== "undefined" ? process.env.NODE_ENV : "development";

    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      maxConnections: config.maxConnections ?? 1000,
      connectionTimeout: config.connectionTimeout ?? 300000, // 5 minutes
      enableLogging: config.enableLogging ?? nodeEnv === "development",
    };

    this.startHeartbeat();
    this.startCleanupInterval();
  }

  /**
   * Add a new client connection
   */
  async addClient(
    clientId: string,
    request: any,
    response: Response,
    controller: ReadableStreamDefaultController,
    stream: ReadableStream | null,
    userId?: string,
    sessionId?: string,
  ): Promise<SSEClient> {
    if (this.clients.size >= this.config.maxConnections) {
      throw new Error(
        `Connection limit exceeded: ${this.config.maxConnections}`,
      );
    }

    const client: SSEClient = {
      id: clientId,
      userId,
      sessionId,
      request,
      response,
      controller,
      stream,
      lastActivity: Date.now(),
      isConnected: true,
    };

    this.clients.set(clientId, client);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    this.log(`Client connected: ${clientId}`, {
      userId: userId,
      sessionId: sessionId,
    });
    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    client.isConnected = false;
    this.clients.delete(clientId);
    this.stats.activeConnections--;

    this.log(`Client disconnected: ${clientId}`);
    return true;
  }

  /**
   * Send an event to a specific client
   */
  async sendToClient(
    clientId: string,
    event: string,
    payload: SSEEventPayload,
  ): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client || !client.isConnected) {
      this.log(`Client not found or disconnected: ${clientId}`, {
        event: event,
      });
      return false;
    }

    try {
      const sseEvent: SSEEvent = {
        id: Date.now().toString(),
        event,
        data: JSON.stringify(payload),
      };

      await this.sendEvent(client, sseEvent);
      client.lastActivity = Date.now();
      this.stats.totalEventsSent++;

      this.log(`Event sent to client ${clientId}: ${event}`, undefined);
      return true;
    } catch (error) {
      this.handleError({
        type: SSEErrorType.STREAM_ERROR,
        message: `Failed to send event to client ${clientId}: ${error}`,
        clientId,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Broadcast an event to multiple clients
   */
  async broadcast(
    event: string,
    payload: SSEEventPayload,
    options: SSEBroadcastOptions = {},
  ): Promise<number> {
    const {
      excludeClientIds = [],
      includeClientIds,
      userIds,
      sessionIds,
    } = options;
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isConnected) continue;

      // Skip excluded clients
      if (excludeClientIds.includes(clientId)) continue;

      // If includeClientIds is specified, only send to those clients
      if (includeClientIds && !includeClientIds.includes(clientId)) continue;

      // If userIds is specified, only send to those users
      if (userIds && client.userId && !userIds.includes(client.userId))
        continue;

      // If sessionIds is specified, only send to those sessions
      if (
        sessionIds &&
        client.sessionId &&
        !sessionIds.includes(client.sessionId)
      )
        continue;

      const success = await this.sendToClient(clientId, event, payload);
      if (success) {
        sentCount++;
      }
    }

    this.stats.totalBroadcasts++;
    this.log(`Broadcast sent: ${event} to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Send an event to all clients of a specific user
   */
  async sendToUser(
    userId: string,
    event: string,
    payload: SSEEventPayload,
  ): Promise<number> {
    return this.broadcast(event, payload, { userIds: [userId] });
  }

  /**
   * Send an event to all clients of a specific session
   */
  async sendToSession(
    sessionId: string,
    event: string,
    payload: SSEEventPayload,
  ): Promise<number> {
    return this.broadcast(event, payload, { sessionIds: [sessionId] });
  }

  /**
   * Get connection statistics
   */
  getStats(): SSEConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get all active client IDs
   */
  getActiveClientIds(): string[] {
    return Array.from(this.clients.keys()).filter(
      (id) => this.clients.get(id)?.isConnected,
    );
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Check if a client is connected
   */
  isClientConnected(clientId: string): boolean {
    const client = this.clients.get(clientId);
    return client?.isConnected ?? false;
  }

  /**
   * Send a heartbeat to all connected clients
   */
  private async sendHeartbeat(): Promise<void> {
    const heartbeatEvent: SSEEvent = {
      event: "heartbeat",
      data: JSON.stringify({ timestamp: Date.now() }),
    };

    for (const [clientId, client] of this.clients.entries()) {
      if (client.isConnected) {
        try {
          await this.sendEvent(client, heartbeatEvent);
        } catch (error) {
          this.log(`Heartbeat failed for client ${clientId}: ${String(error)}`);
          this.removeClient(clientId);
        }
      }
    }
  }

  /**
   * Send an SSE event to a client
   */
  private async sendEvent(client: SSEClient, event: SSEEvent): Promise<void> {
    const eventString = this.formatSSEEvent(event);

    try {
      client.controller.enqueue(new TextEncoder().encode(eventString));
    } catch (error) {
      throw new Error(`Failed to send event: ${String(error)}`);
    }
  }

  /**
   * Format an SSE event as a string
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = "";

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    formatted += `event: ${event.event}\n`;
    formatted += `data: ${event.data}\n`;

    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    formatted += "\n";
    return formatted;
  }

  /**
   * Start the heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch((error) => {
        this.log(`Heartbeat error: ${error}`);
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Start the cleanup interval to remove stale connections
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const staleClients: string[] = [];

      for (const [clientId, client] of this.clients.entries()) {
        if (
          client.isConnected &&
          now - client.lastActivity > this.config.connectionTimeout
        ) {
          staleClients.push(clientId);
        }
      }

      staleClients.forEach((clientId) => {
        this.removeClient(clientId);
        this.log(`Removed stale client: ${clientId}`);
      });
    }, 60000); // Check every minute
  }

  /**
   * Handle SSE errors
   */
  private handleError(error: SSEError): void {
    this.log(`SSE Error: ${error.type} - ${error.message}`, { error: error });

    // In production, you might want to send this to an error tracking service
    const nodeEnv =
      typeof process !== "undefined" ? process.env.NODE_ENV : "development";
    if (nodeEnv === "production") {
      console.error("SSE Error:", error);
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.config.enableLogging) {
      console.log(`[SSE Manager] ${message}`, data || "");
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [clientId] of this.clients.entries()) {
      this.removeClient(clientId);
    }

    this.log("SSE Manager destroyed");
  }
}

// Create a singleton instance
export const sseManager = new SSEManager();
