/**
 * Health Monitor
 *
 * Manages heartbeat mechanism, client health monitoring, and stale connection cleanup
 */

import type {
  ClientId,
  HealthConfig,
  HealthStats,
  HealthStatus,
  SSEEvent,
  Result,
  SSEErrorCode,
} from "../types";
import {
  SSEError as SSEErrorClass,
  SystemEventType as SystemEvent,
} from "../types";
import type { IConnectionManager } from "./connection-manager";
import type { IEventDispatcher } from "./event-dispatcher";

export interface IHealthMonitor {
  // Heartbeat management
  start(): void;
  stop(): void;
  sendHeartbeat(): void;
  handleClientPing(clientId: ClientId): Result<void>;

  // Health checks
  checkConnectionHealth(clientId: ClientId): HealthStatus;
  getSystemHealth(): HealthStatus;

  // Statistics
  getStats(): HealthStats;

  // Cleanup
  identifyStaleConnections(): ClientId[];
  cleanupUnhealthyConnections(): number;
}

export class HealthMonitor implements IHealthMonitor {
  private heartbeatTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private lastPingTimes: Map<ClientId, number>;
  private stats: HealthStats;
  private isRunning = false;

  constructor(
    private readonly config: HealthConfig,
    private readonly connectionManager: IConnectionManager,
    private readonly eventDispatcher: IEventDispatcher,
  ) {
    this.lastPingTimes = new Map();
    this.stats = {
      totalHeartbeatsSent: 0,
      totalHeartbeatsReceived: 0,
      clientTimeouts: 0,
      unhealthyConnections: 0,
    };
  }

  /**
   * Start the health monitoring system
   */
  start(): void {
    if (!this.config.enabled) {
      console.info("Health monitoring is disabled");
      return;
    }

    if (this.isRunning) {
      console.warn("Health monitor is already running");
      return;
    }

    console.info("Starting health monitor", {
      heartbeatInterval: this.config.heartbeatInterval,
      clientTimeout: this.config.clientTimeout,
      cleanupInterval: this.config.cleanupInterval,
    });

    // Start heartbeat timer
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupUnhealthyConnections();
    }, this.config.cleanupInterval);

    this.isRunning = true;
  }

  /**
   * Stop the health monitoring system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.info("Stopping health monitor");

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.isRunning = false;
  }

  /**
   * Send heartbeat to all connections
   */
  sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      type: SystemEvent.HEARTBEAT,
      data: {
        timestamp: Date.now(),
        interval: this.config.heartbeatInterval,
        nextHeartbeat: Date.now() + this.config.heartbeatInterval,
      },
    };

    const result = this.eventDispatcher.broadcast(heartbeatEvent);

    if (result.success) {
      this.stats.totalHeartbeatsSent += result.data.sentCount;
      this.stats.lastHeartbeat = new Date();

      console.debug(`Heartbeat sent to ${result.data.sentCount} connections`);
    } else {
      console.error("Failed to send heartbeat:", result.error);
    }
  }

  /**
   * Handle ping from client
   */
  handleClientPing(clientId: ClientId): Result<void> {
    const connection = this.connectionManager.getConnection(clientId);

    if (!connection) {
      return {
        success: false,
        error: new SSEErrorClass(
          "CLIENT_NOT_FOUND" as SSEErrorCode,
          `Client ${clientId} not found`,
        ),
      };
    }

    // Update ping time
    this.lastPingTimes.set(clientId, Date.now());
    this.stats.totalHeartbeatsReceived++;

    // Update connection activity
    this.connectionManager.updateLastActivity(clientId);

    // Send pong response
    const pongEvent: SSEEvent = {
      type: "system:pong",
      data: {
        timestamp: Date.now(),
        clientId,
      },
    };

    this.eventDispatcher.sendToClient(clientId, pongEvent);

    return { success: true, data: undefined };
  }

  /**
   * Check health of a specific connection
   */
  checkConnectionHealth(clientId: ClientId): HealthStatus {
    const connection = this.connectionManager.getConnection(clientId);

    if (!connection) {
      return "unhealthy";
    }

    if (connection.state !== "connected") {
      return "unhealthy";
    }

    const lastActivity = connection.lastActivity.getTime();
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;

    // Check if connection is stale
    if (timeSinceActivity > this.config.clientTimeout) {
      return "unhealthy";
    }

    // Check if connection is degraded (approaching timeout)
    if (timeSinceActivity > this.config.clientTimeout * 0.75) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): HealthStatus {
    const connections = this.connectionManager.getAllConnections();

    if (connections.size === 0) {
      return "healthy"; // No connections is not unhealthy
    }

    let degradedCount = 0;
    let unhealthyCount = 0;

    for (const [clientId] of connections) {
      const health = this.checkConnectionHealth(clientId);

      switch (health) {
        case "degraded":
          degradedCount++;
          break;
        case "unhealthy":
          unhealthyCount++;
          break;
      }
    }

    const total = connections.size;
    const unhealthyPercentage = (unhealthyCount / total) * 100;
    const degradedPercentage = (degradedCount / total) * 100;

    // System is unhealthy if >20% connections are unhealthy
    if (unhealthyPercentage > 20) {
      return "unhealthy";
    }

    // System is degraded if >30% connections are degraded or unhealthy
    if (degradedPercentage + unhealthyPercentage > 30) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Get health statistics
   */
  getStats(): HealthStats {
    return {
      ...this.stats,
      unhealthyConnections: this.identifyStaleConnections().length,
    };
  }

  /**
   * Identify stale connections
   */
  identifyStaleConnections(): ClientId[] {
    const staleConnections: ClientId[] = [];
    const connections = this.connectionManager.getAllConnections();
    const now = Date.now();

    for (const [clientId, connection] of connections) {
      const lastActivity = connection.lastActivity.getTime();
      const timeSinceActivity = now - lastActivity;

      if (timeSinceActivity > this.config.clientTimeout) {
        staleConnections.push(clientId);
      }
    }

    return staleConnections;
  }

  /**
   * Clean up unhealthy connections
   */
  cleanupUnhealthyConnections(): number {
    const staleConnections = this.identifyStaleConnections();
    let cleanedCount = 0;

    for (const clientId of staleConnections) {
      const result = this.connectionManager.removeConnection(
        clientId,
        "health_check_timeout",
      );

      if (result.success) {
        cleanedCount++;
        this.stats.clientTimeouts++;
        this.lastPingTimes.delete(clientId);

        console.info(`Removed stale connection: ${clientId}`);
      }
    }

    if (cleanedCount > 0) {
      console.info(`Cleaned up ${cleanedCount} stale connections`);
    }

    return cleanedCount;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalHeartbeatsSent: 0,
      totalHeartbeatsReceived: 0,
      clientTimeouts: 0,
      unhealthyConnections: 0,
    };
    this.lastPingTimes.clear();
  }

  /**
   * Get detailed health report
   */
  getHealthReport(): {
    systemHealth: HealthStatus;
    stats: HealthStats;
    connectionHealth: Map<ClientId, HealthStatus>;
    recommendations: string[];
  } {
    const systemHealth = this.getSystemHealth();
    const connectionHealth = new Map<ClientId, HealthStatus>();
    const recommendations: string[] = [];

    const connections = this.connectionManager.getAllConnections();

    for (const [clientId] of connections) {
      connectionHealth.set(clientId, this.checkConnectionHealth(clientId));
    }

    // Generate recommendations
    if (systemHealth === "unhealthy") {
      recommendations.push(
        "System health is critical. Consider increasing timeout values or investigating network issues.",
      );
    }

    if (this.stats.clientTimeouts > 10) {
      recommendations.push(
        "High number of client timeouts detected. Check client network stability.",
      );
    }

    const connectionCount = connections.size;
    if (connectionCount > 1000) {
      recommendations.push(
        "High number of connections. Consider implementing connection pooling or load balancing.",
      );
    }

    return {
      systemHealth,
      stats: this.getStats(),
      connectionHealth,
      recommendations,
    };
  }
}
