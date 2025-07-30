/**
 * Centralized Server-Sent Events (SSE) Service
 *
 * This service provides a clean, centralized interface for managing SSE connections
 * and broadcasting events to clients. It follows enterprise best practices for
 * connection management, error handling, and resource cleanup.
 *
 * Features:
 * - Centralized connection management
 * - Type-safe event system
 * - Automatic heartbeat and connection health monitoring
 * - Graceful shutdown and cleanup
 * - Comprehensive logging and error handling
 * - Memory leak prevention
 */

import { sseLogger } from "./logger";

// Core types for the SSE system
export interface SSEClient {
  readonly id: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly connectedAt: Date;
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly encoder: TextEncoder;
  lastHeartbeat?: Date;
  metadata?: Record<string, unknown>;
}

export interface SSEEvent<T = unknown> {
  readonly type: string;
  readonly data: T;
  readonly timestamp?: string;
  readonly id?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface SSEServiceConfig {
  heartbeatInterval: number;
  clientTimeout: number;
  maxClients: number;
  enableHeartbeat: boolean;
}

export interface SSEStats {
  totalClients: number;
  totalUsers: number;
  totalSessions: number;
  uptime: number;
  heartbeatEnabled: boolean;
  lastHeartbeat?: Date;
}

// Default configuration
const DEFAULT_CONFIG: SSEServiceConfig = {
  heartbeatInterval: 30000, // 30 seconds
  clientTimeout: 60000, // 60 seconds
  maxClients: 1000,
  enableHeartbeat: true,
};

/**
 * Centralized SSE Service Class
 *
 * This class manages all SSE connections and provides a clean API for
 * sending events to clients. It's designed as a singleton to ensure
 * centralized state management.
 */
class SSEService {
  private readonly config: SSEServiceConfig;
  private readonly clients = new Map<string, SSEClient>();
  private readonly userClients = new Map<string, Set<string>>();
  private readonly sessionClients = new Map<string, Set<string>>();
  private readonly disconnectHandlers = new Map<string, Array<() => void>>();

  private heartbeatTimer?: NodeJS.Timeout;
  private isShuttingDown = false;
  private readonly startTime = Date.now();

  constructor(config: Partial<SSEServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    sseLogger.info("SSEService", "Initializing SSE Service", {
      heartbeatInterval: this.config.heartbeatInterval,
      clientTimeout: this.config.clientTimeout,
      maxClients: this.config.maxClients,
      enableHeartbeat: this.config.enableHeartbeat,
    });

    this.startHeartbeat();
    this.setupGracefulShutdown();
  }

  /**
   * Create a new SSE connection for a client
   */
  createConnection(options: SSEConnectionOptions = {}): {
    clientId: string;
    stream: ReadableStream<Uint8Array>;
  } {
    if (this.isShuttingDown) {
      throw new Error("SSE Service is shutting down");
    }

    if (this.clients.size >= this.config.maxClients) {
      throw new Error(
        `Maximum client limit reached: ${this.config.maxClients}`,
      );
    }

    const clientId = this.generateClientId();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId: options.userId,
          sessionId: options.sessionId,
          connectedAt: new Date(),
          controller,
          encoder,
          metadata: options.metadata,
        };

        this.addClient(client);
        this.sendWelcomeMessage(client);
      },
      cancel: () => {
        this.removeClient(clientId, "client_cancelled");
      },
    });

    return { clientId, stream };
  }

  /**
   * Send an event to a specific client
   */
  sendToClient<T>(clientId: string, event: SSEEvent<T>): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      sseLogger.warn("SSEService", "Client not found for sendToClient", {
        clientId,
        eventType: event.type,
      });
      return false;
    }

    return this.sendEventToClient(client, event);
  }

  /**
   * Send an event to all clients of a specific user
   */
  sendToUser<T>(userId: string, event: SSEEvent<T>): number {
    const clientIds = this.userClients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      sseLogger.debug("SSEService", "No clients found for user", {
        userId,
        eventType: event.type,
      });
      return 0;
    }

    let successCount = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && this.sendEventToClient(client, event)) {
        successCount++;
      }
    }

    sseLogger.info("SSEService", "Event sent to user clients", {
      userId,
      eventType: event.type,
      totalClients: clientIds.size,
      successCount,
    });

    return successCount;
  }

  /**
   * Send an event to all clients in a session
   */
  sendToSession<T>(sessionId: string, event: SSEEvent<T>): number {
    const clientIds = this.sessionClients.get(sessionId);
    if (!clientIds || clientIds.size === 0) {
      sseLogger.debug("SSEService", "No clients found for session", {
        sessionId,
        eventType: event.type,
      });
      return 0;
    }

    let successCount = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && this.sendEventToClient(client, event)) {
        successCount++;
      }
    }

    sseLogger.info("SSEService", "Event sent to session clients", {
      sessionId,
      eventType: event.type,
      totalClients: clientIds.size,
      successCount,
    });

    return successCount;
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast<T>(event: SSEEvent<T>): number {
    let successCount = 0;
    for (const client of this.clients.values()) {
      if (this.sendEventToClient(client, event)) {
        successCount++;
      }
    }

    sseLogger.info("SSEService", "Event broadcasted to all clients", {
      eventType: event.type,
      totalClients: this.clients.size,
      successCount,
    });

    return successCount;
  }

  /**
   * Get service statistics
   */
  getStats(): SSEStats {
    return {
      totalClients: this.clients.size,
      totalUsers: this.userClients.size,
      totalSessions: this.sessionClients.size,
      uptime: Date.now() - this.startTime,
      heartbeatEnabled: this.config.enableHeartbeat,
      lastHeartbeat: this.heartbeatTimer ? new Date() : undefined,
    };
  }

  /**
   * Get all connected clients (for debugging/admin purposes)
   */
  getClients(): Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
    lastHeartbeat?: Date;
  }> {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
    }));
  }

  /**
   * Add a disconnect handler for a client
   */
  onDisconnect(clientId: string, handler: () => void): void {
    if (!this.disconnectHandlers.has(clientId)) {
      this.disconnectHandlers.set(clientId, []);
    }
    this.disconnectHandlers.get(clientId)!.push(handler);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string, reason: string = "unknown"): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    sseLogger.info("SSEService", "Removing client", {
      clientId,
      userId: client.userId,
      sessionId: client.sessionId,
      reason,
      connectionDuration: Date.now() - client.connectedAt.getTime(),
    });

    // Execute disconnect handlers
    const handlers = this.disconnectHandlers.get(clientId);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler();
        } catch (error) {
          sseLogger.error(
            "SSEService",
            "Error in disconnect handler",
            {
              clientId,
              reason,
            },
            error as Error,
          );
        }
      });
      this.disconnectHandlers.delete(clientId);
    }

    // Close the connection
    try {
      client.controller.close();
    } catch (error) {
      sseLogger.warn(
        "SSEService",
        "Error closing client controller",
        {
          clientId,
          reason,
        },
        error as Error,
      );
    }

    // Remove from tracking maps
    this.clients.delete(clientId);

    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    if (client.sessionId) {
      const sessionClients = this.sessionClients.get(client.sessionId);
      if (sessionClients) {
        sessionClients.delete(clientId);
        if (sessionClients.size === 0) {
          this.sessionClients.delete(client.sessionId);
        }
      }
    }

    sseLogger.debug("SSEService", "Client removed successfully", {
      clientId,
      reason,
      remainingClients: this.clients.size,
    });
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown(timeoutMs: number = 10000): Promise<void> {
    sseLogger.info("SSEService", "Starting graceful shutdown", {
      totalClients: this.clients.size,
      timeoutMs,
    });

    this.isShuttingDown = true;
    this.stopHeartbeat();

    // Send shutdown notification to all clients
    this.broadcast({
      type: "system:shutdown",
      data: {
        message: "Server is shutting down",
        timestamp: new Date().toISOString(),
      },
    });

    // Wait for clients to disconnect or timeout
    const startTime = Date.now();
    while (this.clients.size > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Force disconnect remaining clients
    if (this.clients.size > 0) {
      sseLogger.warn("SSEService", "Force disconnecting remaining clients", {
        remainingClients: this.clients.size,
      });

      const clientIds = Array.from(this.clients.keys());
      for (const clientId of clientIds) {
        this.removeClient(clientId, "force_shutdown");
      }
    }

    // Clear all state
    this.clients.clear();
    this.userClients.clear();
    this.sessionClients.clear();
    this.disconnectHandlers.clear();

    sseLogger.info("SSEService", "Graceful shutdown completed");
  }

  // Private methods

  private addClient(client: SSEClient): void {
    sseLogger.info("SSEService", "Adding new client", {
      clientId: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      totalClients: this.clients.size + 1,
    });

    this.clients.set(client.id, client);

    // Track by user
    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client.id);
    }

    // Track by session
    if (client.sessionId) {
      if (!this.sessionClients.has(client.sessionId)) {
        this.sessionClients.set(client.sessionId, new Set());
      }
      this.sessionClients.get(client.sessionId)!.add(client.id);
    }
  }

  private sendWelcomeMessage(client: SSEClient): void {
    const welcomeEvent: SSEEvent = {
      type: "system:connected",
      data: {
        clientId: client.id,
        userId: client.userId,
        sessionId: client.sessionId,
        connectedAt: client.connectedAt.toISOString(),
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.sendEventToClient(client, welcomeEvent);
  }

  private sendEventToClient<T>(client: SSEClient, event: SSEEvent<T>): boolean {
    try {
      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      };

      const sseData = `data: ${JSON.stringify(eventWithTimestamp)}\n\n`;
      client.controller.enqueue(client.encoder.encode(sseData));

      return true;
    } catch (error) {
      sseLogger.error(
        "SSEService",
        "Failed to send event to client",
        {
          clientId: client.id,
          eventType: event.type,
        },
        error as Error,
      );

      // Remove the client if sending fails
      this.removeClient(client.id, "send_failed");
      return false;
    }
  }

  private startHeartbeat(): void {
    if (!this.config.enableHeartbeat) {
      return;
    }

    sseLogger.info("SSEService", "Starting heartbeat mechanism", {
      interval: this.config.heartbeatInterval,
      timeout: this.config.clientTimeout,
    });

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleClients();
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      sseLogger.info("SSEService", "Heartbeat stopped");
    }
  }

  private sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      type: "system:heartbeat",
      data: {
        timestamp: new Date().toISOString(),
        clientCount: this.clients.size,
      },
    };

    let successCount = 0;
    for (const client of this.clients.values()) {
      if (this.sendEventToClient(client, heartbeatEvent)) {
        client.lastHeartbeat = new Date();
        successCount++;
      }
    }

    sseLogger.debug("SSEService", "Heartbeat sent", {
      totalClients: this.clients.size,
      successCount,
    });
  }

  private cleanupStaleClients(): void {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (client.lastHeartbeat) {
        const timeSinceHeartbeat = now - client.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > this.config.clientTimeout) {
          staleClients.push(clientId);
        }
      }
    }

    if (staleClients.length > 0) {
      sseLogger.info("SSEService", "Cleaning up stale clients", {
        staleCount: staleClients.length,
        timeout: this.config.clientTimeout,
      });

      for (const clientId of staleClients) {
        this.removeClient(clientId, "heartbeat_timeout");
      }
    }
  }

  private generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private setupGracefulShutdown(): void {
    const handleShutdown = async (signal: string) => {
      sseLogger.info("SSEService", `Received ${signal}, initiating shutdown`);
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        sseLogger.error(
          "SSEService",
          "Error during shutdown",
          {},
          error as Error,
        );
        process.exit(1);
      }
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGUSR2", () => handleShutdown("SIGUSR2")); // nodemon
  }
}

// Export singleton instance
export const sseService = new SSEService();

// Types are already exported as interfaces above
