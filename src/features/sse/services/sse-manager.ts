import { logger } from "@/utils/logging";
import type {
  SSEClient,
  SSEMessage,
  SSEConnectionOptions,
  SSEManagerConfig,
} from "../types";

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private sessionConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEManagerConfig>;
  private sseLogger = logger.createContextLogger("SSE");

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      maxConnections: config.maxConnections ?? 1000,
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Register a new client connection
   */
  public registerClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    options: SSEConnectionOptions = {},
  ): boolean {
    if (this.clients.size >= this.config.maxConnections) {
      this.sseLogger.warn(
        `Maximum connections reached (${this.config.maxConnections})`,
      );
      return false;
    }

    const client: SSEClient = {
      id: clientId,
      userId: options.userId,
      sessionId: options.sessionId,
      controller,
      lastPing: Date.now(),
      isConnected: true,
    };

    this.clients.set(clientId, client);

    // Track user connections
    if (options.userId) {
      if (!this.userConnections.has(options.userId)) {
        this.userConnections.set(options.userId, new Set());
      }
      this.userConnections.get(options.userId)!.add(clientId);
    }

    // Track session connections
    if (options.sessionId) {
      if (!this.sessionConnections.has(options.sessionId)) {
        this.sessionConnections.set(options.sessionId, new Set());
      }
      this.sessionConnections.get(options.sessionId)!.add(clientId);
    }

    this.sseLogger.info(`Client ${clientId} connected`, {
      userId: options.userId,
      sessionId: options.sessionId,
      totalConnections: this.clients.size,
    });

    return true;
  }

  /**
   * Remove a client connection
   */
  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from user connections
    if (client.userId) {
      const userConnections = this.userConnections.get(client.userId);
      if (userConnections) {
        userConnections.delete(clientId);
        if (userConnections.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }

    // Remove from session connections
    if (client.sessionId) {
      const sessionConnections = this.sessionConnections.get(client.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(clientId);
        if (sessionConnections.size === 0) {
          this.sessionConnections.delete(client.sessionId);
        }
      }
    }

    this.clients.delete(clientId);

    this.sseLogger.info(`Client ${clientId} disconnected`, {
      totalConnections: this.clients.size,
    });
  }

  /**
   * Send a message to specific clients
   */
  public sendMessage(message: SSEMessage): void {
    const targetClients = this.getTargetClients(message);

    this.sseLogger.debug(`message: ${JSON.stringify(message)}`);

    for (const clientId of targetClients) {
      this.sendToClient(clientId, message);
    }

    this.sseLogger.debug(`Sent message to ${targetClients.size} clients`, {
      event: message.event,
      target: message.target,
      targetId: message.targetId,
    });
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(clientId: string, message: SSEMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isConnected) {
      this.removeClient(clientId);
      return;
    }

    try {
      const sseData = this.formatSSEMessage(message);
      client.controller.enqueue(new TextEncoder().encode(sseData));
      client.lastPing = Date.now();
    } catch (error) {
      this.sseLogger.error(
        `Failed to send message to client ${clientId}`,
        error,
      );
      this.removeClient(clientId);
    }
  }

  /**
   * Get target clients based on message targeting
   */
  private getTargetClients(message: SSEMessage): Set<string> {
    switch (message.target) {
      case "all":
        return new Set(this.clients.keys());

      case "user":
        if (message.targetId) {
          return this.userConnections.get(message.targetId) ?? new Set();
        }
        break;

      case "session":
        if (message.targetId) {
          return this.sessionConnections.get(message.targetId) ?? new Set();
        }
        break;

      case "client":
        if (message.targetId && this.clients.has(message.targetId)) {
          return new Set([message.targetId]);
        }
        break;
    }

    return new Set();
  }

  /**
   * Format message for SSE protocol
   */
  private formatSSEMessage(message: SSEMessage): string {
    const lines = [];

    if (message.event) {
      lines.push(`event: ${message.event}`);
    }

    lines.push(`data: ${JSON.stringify(message.data)}`);
    lines.push(""); // Empty line to end the message

    return lines.join("\n");
  }

  /**
   * Send heartbeat to all connected clients
   */
  private sendHeartbeat(): void {
    const heartbeatMessage: SSEMessage = {
      event: "ping",
      data: { timestamp: Date.now() },
      target: "all",
    };

    this.sendMessage(heartbeatMessage);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = this.config.heartbeatInterval * 2; // 2x heartbeat interval

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > staleThreshold) {
        this.sseLogger.warn(`Removing stale client ${clientId}`);
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      totalConnections: this.clients.size,
      userConnections: this.userConnections.size,
      sessionConnections: this.sessionConnections.size,
      maxConnections: this.config.maxConnections,
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const client of this.clients.values()) {
      try {
        client.controller.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    this.clients.clear();
    this.userConnections.clear();
    this.sessionConnections.clear();

    this.sseLogger.info("Manager destroyed");
  }
}
