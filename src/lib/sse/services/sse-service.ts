/**
 * SSE Service
 *
 * Main facade for the Server-Sent Events system
 * Coordinates all components and provides a unified API
 */

import type {
  ConnectionOptions,
  ConnectionResult,
  ClientId,
  SSEEvent,
  SendParams,
  DispatchResult,
  SSEMetrics,
  HealthStatus,
  SSEConfig,
  Result,
  SSEErrorCode,
  EventTarget,
} from "../types";
import {
  DEFAULT_CONFIG,
  SSEError as SSEErrorClass,
  SystemEventType as SystemEvent,
} from "../types";
import { ConnectionManager } from "../core/connection-manager";
import { EventDispatcher } from "../core/event-dispatcher";
import { HealthMonitor } from "../core/health-monitor";
import { MetricsCollector } from "../core/metrics-collector";

export interface ISSEService {
  // Connection Management
  createConnection(options: ConnectionOptions): Result<ConnectionResult>;
  closeConnection(clientId: ClientId, reason?: string): Result<void>;
  getConnection(clientId: ClientId): boolean;

  // Event Operations
  send<T>(params: SendParams<T>): Result<DispatchResult>;
  sendToClient<T>(
    clientId: ClientId,
    event: SSEEvent<T>,
  ): Result<DispatchResult>;
  sendToUser<T>(userId: string, event: SSEEvent<T>): Result<DispatchResult>;
  sendToSession<T>(
    sessionId: string,
    event: SSEEvent<T>,
  ): Result<DispatchResult>;
  broadcast<T>(event: SSEEvent<T>): Result<DispatchResult>;

  // Monitoring
  getMetrics(): SSEMetrics;
  getHealth(): HealthStatus;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export class SSEService implements ISSEService {
  private readonly config: SSEConfig;
  private readonly connectionManager: ConnectionManager;
  private readonly eventDispatcher: EventDispatcher;
  private readonly healthMonitor: HealthMonitor;
  private readonly metricsCollector: MetricsCollector;
  private isInitialized = false;
  private isShuttingDown = false;

  constructor(config: Partial<SSEConfig> = {}) {
    // Merge with default config
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize core components
    this.connectionManager = new ConnectionManager(this.config.maxConnections);
    this.eventDispatcher = new EventDispatcher(this.connectionManager);
    this.healthMonitor = new HealthMonitor(
      this.config.health,
      this.connectionManager,
      this.eventDispatcher,
    );
    this.metricsCollector = new MetricsCollector(
      this.connectionManager,
      this.healthMonitor,
    );

    console.info("SSE Service created", {
      maxConnections: this.config.maxConnections,
      healthEnabled: this.config.health.enabled,
      rateLimitEnabled: this.config.rateLimit.enabled,
    });
  }

  /**
   * Initialize the SSE service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn("SSE Service is already initialized");
      return;
    }

    console.info("Initializing SSE Service...");

    // Start health monitoring
    if (this.config.health.enabled) {
      this.healthMonitor.start();
    }

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    this.isInitialized = true;
    console.info("SSE Service initialized successfully");
  }

  /**
   * Create a new SSE connection
   */
  createConnection(options: ConnectionOptions = {}): Result<ConnectionResult> {
    if (this.isShuttingDown) {
      return {
        success: false,
        error: new SSEErrorClass(
          "INTERNAL_ERROR" as SSEErrorCode,
          "Service is shutting down",
        ),
      };
    }

    if (!this.isInitialized) {
      console.warn("SSE Service not initialized, initializing now...");
      this.initialize().catch(console.error);
    }

    // Create the connection
    const result = this.connectionManager.createConnection(options);

    if (result.success) {
      // Record metrics
      this.metricsCollector.recordConnection(result.data.clientId);

      // Log connection
      console.info("SSE connection created", {
        clientId: result.data.clientId,
        userId: options.userId,
        sessionId: options.sessionId,
        activeConnections: this.connectionManager.getConnectionCount(),
        userCount: this.connectionManager.getUserCount(),
      });
    }

    return result;
  }

  /**
   * Close an SSE connection
   */
  closeConnection(clientId: ClientId, reason = "manual"): Result<void> {
    // Send goodbye message before closing
    const goodbyeEvent: SSEEvent = {
      type: SystemEvent.CONNECTION_CLOSED,
      data: {
        reason,
        timestamp: Date.now(),
      },
    };

    this.eventDispatcher.sendToClient(clientId, goodbyeEvent);

    // Get connection duration for metrics
    const connection = this.connectionManager.getConnection(clientId);
    const duration = connection
      ? Date.now() - connection.connectedAt.getTime()
      : 0;

    // Remove the connection
    const result = this.connectionManager.removeConnection(clientId, reason);

    if (result.success) {
      // Record metrics
      this.metricsCollector.recordDisconnection(clientId, duration);

      console.info("SSE connection closed", {
        clientId,
        reason,
        duration,
      });
    }

    return result;
  }

  /**
   * Check if a connection exists
   */
  getConnection(clientId: ClientId): boolean {
    return this.connectionManager.hasConnection(clientId);
  }

  /**
   * Send event using generic parameters
   */
  send<T>(params: SendParams<T>): Result<DispatchResult> {
    if (this.isShuttingDown) {
      return {
        success: false,
        error: new SSEErrorClass(
          "INTERNAL_ERROR" as SSEErrorCode,
          "Service is shutting down",
        ),
      };
    }

    const result = this.eventDispatcher.send(params);

    // Record metrics
    if (result.success) {
      this.metricsCollector.recordEventSent(params.event, result.data.success);
    } else {
      this.metricsCollector.recordEventFailed(
        params.event,
        result.error.message,
      );
    }

    return result;
  }

  /**
   * Send event to specific client
   */
  sendToClient<T>(
    clientId: ClientId,
    event: SSEEvent<T>,
  ): Result<DispatchResult> {
    return this.send({
      target: "client" as EventTarget,
      targetId: clientId,
      event,
    });
  }

  /**
   * Send event to all connections of a user
   */
  sendToUser<T>(userId: string, event: SSEEvent<T>): Result<DispatchResult> {
    return this.send({
      target: "user" as EventTarget,
      targetId: userId,
      event,
    });
  }

  /**
   * Send event to all connections in a session
   */
  sendToSession<T>(
    sessionId: string,
    event: SSEEvent<T>,
  ): Result<DispatchResult> {
    return this.send({
      target: "session" as EventTarget,
      targetId: sessionId,
      event,
    });
  }

  /**
   * Broadcast event to all connections
   */
  broadcast<T>(event: SSEEvent<T>): Result<DispatchResult> {
    return this.send({
      target: "broadcast" as EventTarget,
      event,
    });
  }

  /**
   * Get system metrics
   */
  getMetrics(): SSEMetrics {
    return this.metricsCollector.getMetrics();
  }

  /**
   * Get system health status
   */
  getHealth(): HealthStatus {
    return this.healthMonitor.getSystemHealth();
  }

  /**
   * Get detailed status report
   */
  getStatus(): {
    initialized: boolean;
    shuttingDown: boolean;
    health: HealthStatus;
    metrics: SSEMetrics;
    config: SSEConfig;
  } {
    return {
      initialized: this.isInitialized,
      shuttingDown: this.isShuttingDown,
      health: this.getHealth(),
      metrics: this.getMetrics(),
      config: this.config,
    };
  }

  /**
   * Handle client ping (for heartbeat)
   */
  handlePing(clientId: ClientId): Result<void> {
    return this.healthMonitor.handleClientPing(clientId);
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.warn("SSE Service is already shutting down");
      return;
    }

    this.isShuttingDown = true;
    console.info("Starting SSE Service shutdown...");

    // Stop health monitoring
    this.healthMonitor.stop();

    // Send shutdown notification to all clients
    const shutdownEvent: SSEEvent = {
      type: SystemEvent.SERVER_SHUTDOWN,
      data: {
        message: "Server is shutting down",
        timestamp: Date.now(),
      },
    };

    this.broadcast(shutdownEvent);

    // Wait a bit for events to be sent
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close all connections
    const connections = this.connectionManager.getAllConnections();
    for (const [clientId] of connections) {
      this.closeConnection(clientId, "server_shutdown");
    }

    console.info("SSE Service shutdown complete", {
      closedConnections: connections.size,
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdownHandler = async (signal: string): Promise<void> => {
      console.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };

    // Handle different shutdown signals
    process.once("SIGTERM", () => {
      void shutdownHandler("SIGTERM");
    });
    process.once("SIGINT", () => {
      void shutdownHandler("SIGINT");
    });
    process.once("SIGUSR2", () => {
      void shutdownHandler("SIGUSR2");
    }); // For nodemon
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connectionManager.getConnectionCount();
  }

  /**
   * Get active connections for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.connectionManager.getConnectionsByUser(userId).length;
  }

  /**
   * Get active connections for a session
   */
  getSessionConnectionCount(sessionId: string): number {
    return this.connectionManager.getConnectionsBySession(sessionId).length;
  }

  /**
   * Clean up stale connections manually
   */
  cleanupStaleConnections(): number {
    return this.healthMonitor.cleanupUnhealthyConnections();
  }

  /**
   * Get detailed report
   */
  getDetailedReport(): {
    status: ReturnType<SSEService["getStatus"]>;
    health: ReturnType<HealthMonitor["getHealthReport"]>;
    metrics: ReturnType<MetricsCollector["getDetailedReport"]>;
  } {
    return {
      status: this.getStatus(),
      health: this.healthMonitor.getHealthReport(),
      metrics: this.metricsCollector.getDetailedReport(),
    };
  }
}

// Export singleton instance for convenience
let sseServiceInstance: SSEService | null = null;

export function getSSEService(config?: Partial<SSEConfig>): SSEService {
  sseServiceInstance ??= new SSEService(config);
  return sseServiceInstance;
}

// Also export for direct instantiation
export default SSEService;
