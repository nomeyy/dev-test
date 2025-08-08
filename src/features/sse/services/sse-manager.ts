import { randomUUID } from "crypto";
import type {
  SSEClient,
  SSEEvent,
  SSEManagerOptions,
  SSEMessage,
  SSEStats,
} from "../types";

class SSEManager {
  private clients: Map<string, SSEClient>;
  private userClientMap: Map<string, Set<string>>;
  private heartbeatInterval: NodeJS.Timeout | null;
  private cleanupInterval: NodeJS.Timeout | null;
  private options: Required<SSEManagerOptions>;
  private stats: SSEStats;

  constructor(options: SSEManagerOptions = {}) {
    this.clients = new Map();
    this.userClientMap = new Map();
    this.heartbeatInterval = null;
    this.cleanupInterval = null;

    this.options = {
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      clientTimeout: options.clientTimeout ?? 120000,
      maxClients: options.maxClients ?? 1000,
      enableLogging: options.enableLogging ?? true,
    };

    this.stats = {
      activeConnections: 0,
      totalConnections: 0,
      messagesSent: 0,
      errors: 0,
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Register a new SSE client connection
   */
  addClient(
    controller: ReadableStreamDefaultController,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, unknown>,
  ): string {
    const clientId = randomUUID();

    if (this.clients.size >= this.options.maxClients) {
      this.log("warn", `Max clients reached (${this.options.maxClients})`);
      throw new Error("Maximum number of concurrent connections reached");
    }

    const client: SSEClient = {
      id: clientId,
      userId,
      sessionId,
      controller,
      lastActivity: new Date(),
      metadata,
    };

    this.clients.set(clientId, client);

    if (userId) {
      if (!this.userClientMap.has(userId)) {
        this.userClientMap.set(userId, new Set());
      }
      this.userClientMap.get(userId)!.add(clientId);
    }

    this.stats.activeConnections++;
    this.stats.totalConnections++;

    this.log(
      "info",
      `Client connected: ${clientId} (user: ${userId || "anonymous"})`,
    );

    // Send initial connection message
    this.sendToClient(clientId, {
      event: "connected",
      data: { clientId, timestamp: new Date().toISOString() },
    });

    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.controller.close();
    } catch (error) {
      this.log("error", `Error closing client controller: ${error}`);
    }

    this.clients.delete(clientId);

    if (client.userId && this.userClientMap.has(client.userId)) {
      const userClients = this.userClientMap.get(client.userId)!;
      userClients.delete(clientId);
      if (userClients.size === 0) {
        this.userClientMap.delete(client.userId);
      }
    }

    this.stats.activeConnections--;
    this.log("info", `Client disconnected: ${clientId}`);
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(clientId: string, message: SSEMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      this.log("warn", `Client not found: ${clientId}`);
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const formattedMessage = this.formatMessage(message);
      client.controller.enqueue(encoder.encode(formattedMessage));
      client.lastActivity = new Date();
      this.stats.messagesSent++;
      return true;
    } catch (error) {
      this.log("error", `Error sending to client ${clientId}: ${error}`);
      this.stats.errors++;
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send a message to all clients of a specific user
   */
  sendToUser(userId: string, message: SSEMessage): number {
    const clientIds = this.userClientMap.get(userId);
    if (!clientIds || clientIds.size === 0) {
      this.log("warn", `No clients found for user: ${userId}`);
      return 0;
    }

    let sent = 0;
    for (const clientId of clientIds) {
      if (this.sendToClient(clientId, message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: SSEMessage): number {
    let sent = 0;
    for (const clientId of this.clients.keys()) {
      if (this.sendToClient(clientId, message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Send a message to specific clients or broadcast
   */
  dispatch(event: SSEEvent): number {
    const message: SSEMessage = {
      event: event.type,
      data: event.payload as string | Record<string, unknown>,
    };

    if (event.targets && event.targets.length > 0) {
      let sent = 0;
      for (const target of event.targets) {
        // Check if target is a client ID
        if (this.clients.has(target)) {
          if (this.sendToClient(target, message)) sent++;
        }
        // Check if target is a user ID
        else if (this.userClientMap.has(target)) {
          sent += this.sendToUser(target, message);
        }
      }
      return sent;
    } else {
      return this.broadcast(message);
    }
  }

  /**
   * Format SSE message according to protocol
   */
  private formatMessage(message: SSEMessage): string {
    const lines: string[] = [];

    if (message.id) {
      lines.push(`id: ${message.id}`);
    }

    if (message.event) {
      lines.push(`event: ${message.event}`);
    }

    if (message.retry) {
      lines.push(`retry: ${message.retry}`);
    }

    const data =
      typeof message.data === "string"
        ? message.data
        : JSON.stringify(message.data);

    // Split data by newlines and prefix each line with "data: "
    const dataLines = data.split("\n");
    for (const line of dataLines) {
      lines.push(`data: ${line}`);
    }

    lines.push("", ""); // Double newline to end message
    return lines.join("\n");
  }

  /**
   * Send heartbeat to all clients
   */
  private sendHeartbeat(): void {
    const message: SSEMessage = {
      event: "heartbeat",
      data: { timestamp: new Date().toISOString() },
    };

    let sent = 0;
    const clientIds = Array.from(this.clients.keys());

    for (const clientId of clientIds) {
      if (this.sendToClient(clientId, message)) {
        sent++;
      }
    }

    this.log("debug", `Heartbeat sent to ${sent}/${clientIds.length} clients`);
  }

  /**
   * Clean up inactive clients
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const timeout = this.options.clientTimeout;
    let removed = 0;

    for (const [clientId, client] of this.clients.entries()) {
      const lastActivity = client.lastActivity.getTime();
      if (now - lastActivity > timeout) {
        this.removeClient(clientId);
        removed++;
      }
    }

    if (removed > 0) {
      this.log("info", `Cleaned up ${removed} inactive clients`);
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveClients();
    }, 60000);
  }

  /**
   * Log messages
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
  ): void {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = `[SSE Manager] [${timestamp}]`;

    switch (level) {
      case "debug":
        console.debug(`${prefix} ${message}`);
        break;
      case "info":
        console.info(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      case "error":
        console.error(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * Get current stats
   */
  getStats(): SSEStats {
    return { ...this.stats };
  }

  /**
   * Get client info
   */
  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients for a user
   */
  getUserClients(userId: string): SSEClient[] {
    const clientIds = this.userClientMap.get(userId);
    if (!clientIds) return [];

    const clients: SSEClient[] = [];
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client) clients.push(client);
    }
    return clients;
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }

    this.log("info", "SSE Manager shutdown complete");
  }
}

// Create singleton instance
let sseManager: SSEManager | null = null;

export function getSSEManager(options?: SSEManagerOptions): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager(options);
  }
  return sseManager;
}

export function shutdownSSEManager(): void {
  if (sseManager) {
    sseManager.shutdown();
    sseManager = null;
  }
}

export default SSEManager;
