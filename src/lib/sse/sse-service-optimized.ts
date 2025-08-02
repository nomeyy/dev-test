/**
 * Optimized Centralized SSE Service
 *
 * Modular, maintainable SSE service using composition pattern
 * with separate managers for different concerns
 */

import { sseLogger } from "./logger";
import { ConnectionManager } from "./connection-manager";
import { HeartbeatManager } from "./heartbeat-manager";
import { StatsManager } from "./stats-manager";
import type {
  SSEClient,
  SSEEvent,
  SSEConnectionOptions,
  SSEServiceConfig,
  SSEStats,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Optimized SSE Service Class
 *
 * Uses composition pattern with specialized managers for:
 * - Connection management
 * - Heartbeat monitoring
 * - Statistics and health monitoring
 */
class OptimizedSSEService {
  private readonly config: SSEServiceConfig;
  private readonly connectionManager: ConnectionManager;
  private readonly heartbeatManager: HeartbeatManager;
  private readonly statsManager: StatsManager;
  private isShuttingDown = false;

  constructor(config: Partial<SSEServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize managers
    this.connectionManager = new ConnectionManager();
    this.heartbeatManager = new HeartbeatManager(
      this.config,
      this.connectionManager,
    );
    this.statsManager = new StatsManager(
      this.config,
      this.connectionManager,
      this.heartbeatManager,
    );

    sseLogger.info("SSEService", "Initializing optimized SSE Service", {
      heartbeatInterval: this.config.heartbeatInterval,
      clientTimeout: this.config.clientTimeout,
      maxClients: this.config.maxClients,
      enableHeartbeat: this.config.enableHeartbeat,
    });

    this.initialize();
  }

  /**
   * Initialize the service
   */
  private initialize(): void {
    this.heartbeatManager.start();
    this.setupGracefulShutdown();

    // Broadcast stats when clients connect/disconnect
    this.setupStatsUpdates();
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

    if (
      this.connectionManager.getConnectionStats().totalClients >=
      this.config.maxClients
    ) {
      throw new Error(
        `Maximum client limit reached: ${this.config.maxClients}`,
      );
    }

    const clientId = this.connectionManager.generateClientId();
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

        this.connectionManager.addClient(client);
        this.connectionManager.sendWelcomeMessage(client);
        this.statsManager.broadcastStats();
      },
      cancel: () => {
        this.connectionManager.removeClient(clientId, "client_cancelled");
        this.statsManager.broadcastStats();
      },
    });

    return { clientId, stream };
  }

  // Delegation methods to connection manager
  sendToClient<T>(clientId: string, event: SSEEvent<T>): boolean {
    return this.connectionManager.sendToClient(clientId, event);
  }

  sendToUser<T>(userId: string, event: SSEEvent<T>): number {
    return this.connectionManager.sendToUser(userId, event);
  }

  sendToSession<T>(sessionId: string, event: SSEEvent<T>): number {
    return this.connectionManager.sendToSession(sessionId, event);
  }

  broadcast<T>(event: SSEEvent<T>): number {
    return this.connectionManager.broadcast(event);
  }

  getClient(clientId: string): SSEClient | undefined {
    return this.connectionManager.getClient(clientId);
  }

  hasClient(clientId: string): boolean {
    return this.connectionManager.hasClient(clientId);
  }

  onDisconnect(clientId: string, handler: () => void): void {
    this.connectionManager.onDisconnect(clientId, handler);
  }

  removeClient(clientId: string, reason?: string): void {
    this.connectionManager.removeClient(clientId, reason);
    this.statsManager.broadcastStats();
  }

  // Delegation methods to stats manager
  getStats(): SSEStats {
    return this.statsManager.getStats();
  }

  getClients(): Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
    lastHeartbeat?: Date;
  }> {
    return this.statsManager.getClientInfo();
  }

  // Delegation methods to heartbeat manager
  updateClientPing(clientId: string): boolean {
    return this.heartbeatManager.updateClientPing(clientId);
  }

  getHeartbeatConfig() {
    return this.heartbeatManager.getConfig();
  }

  getHeartbeatStats() {
    return this.heartbeatManager.getStats();
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown(timeoutMs = 10000): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    const stats = this.statsManager.getStats();

    sseLogger.info("SSEService", "Starting graceful shutdown", {
      totalClients: stats.totalClients,
      timeoutMs,
    });

    // Stop heartbeat
    this.heartbeatManager.stop();

    // Notify all clients about shutdown
    const shutdownEvent: SSEEvent = {
      type: "system:shutdown",
      data: {
        message: "Server is shutting down",
        timestamp: new Date().toISOString(),
      },
    };

    this.connectionManager.broadcast(shutdownEvent);

    // Close all connections
    const clients = this.connectionManager.getAllClients();
    for (const [clientId] of clients) {
      this.connectionManager.removeClient(clientId, "server_shutdown");
    }

    sseLogger.info("SSEService", "Graceful shutdown completed", {
      closedClients: stats.totalClients,
    });
  }

  /**
   * Setup automatic stats broadcasting
   */
  private setupStatsUpdates(): void {
    // Stats are automatically broadcasted when clients connect/disconnect
    // via the createConnection and removeClient methods
  }

  /**
   * Setup graceful shutdown handlers
   */
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

    process.on("SIGINT", () => void handleShutdown("SIGINT"));
    process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
    process.on("SIGUSR2", () => void handleShutdown("SIGUSR2")); // nodemon
  }
}

// Export singleton instance
export const sseService = new OptimizedSSEService();

// Re-export types for convenience
export type {
  SSEClient,
  SSEEvent,
  SSEConnectionOptions,
  SSEServiceConfig,
  SSEStats,
} from "./types";
