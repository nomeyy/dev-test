/**
 * SSE Statistics Manager
 *
 * Handles statistics collection, monitoring, and broadcasting
 */

import { sseLogger } from "./logger";
import type { SSEStats, SSEServiceConfig, SSEEvent } from "./types";
import type { ConnectionManager } from "./connection-manager";
import type { HeartbeatManager } from "./heartbeat-manager";

export class StatsManager {
  private readonly startTime = Date.now();

  constructor(
    private readonly config: SSEServiceConfig,
    private readonly connectionManager: ConnectionManager,
    private readonly heartbeatManager: HeartbeatManager,
  ) {}

  /**
   * Get comprehensive service statistics
   */
  getStats(): SSEStats {
    const connectionStats = this.connectionManager.getConnectionStats();
    const heartbeatConfig = this.heartbeatManager.getConfig();
    const heartbeatStats = this.heartbeatManager.getStats();

    return {
      totalClients: connectionStats.totalClients,
      totalUsers: connectionStats.totalUsers,
      totalSessions: connectionStats.totalSessions,
      uptime: Date.now() - this.startTime,
      heartbeatEnabled: heartbeatConfig.enabled,
      heartbeatInterval: heartbeatConfig.interval,
      heartbeatTimeout: heartbeatConfig.timeout,
      totalHeartbeatsSent: heartbeatStats.totalPings, // Note: using received as sent for consistency
      totalHeartbeatsReceived: heartbeatStats.totalPings,
      lastHeartbeat: heartbeatStats.lastPing,
      activeHeartbeats: heartbeatStats.activePings,
    };
  }

  /**
   * Get client information for debugging/admin purposes
   */
  getClientInfo(): Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
    lastHeartbeat?: Date;
  }> {
    const clients = this.connectionManager.getAllClients();

    return Array.from(clients.values()).map((client) => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
    }));
  }

  /**
   * Broadcast updated stats to all connected clients
   */
  broadcastStats(): void {
    const stats = this.getStats();
    const statsEvent: SSEEvent = {
      type: "system:stats",
      data: {
        stats,
        timestamp: new Date().toISOString(),
      },
    };

    const sentCount = this.connectionManager.broadcast(statsEvent);

    sseLogger.debug("StatsManager", "Stats broadcasted to all clients", {
      totalClients: stats.totalClients,
      totalUsers: stats.totalUsers,
      totalSessions: stats.totalSessions,
      sentCount,
    });
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    status: "healthy" | "warning" | "critical";
    checks: {
      clientCount: {
        status: "ok" | "warning" | "critical";
        value: number;
        threshold: number;
      };
      uptime: { status: "ok"; value: number };
      heartbeat: { status: "ok" | "disabled"; enabled: boolean };
    };
  } {
    const stats = this.getStats();
    const clientThreshold = this.config.maxClients * 0.8; // 80% threshold

    let clientStatus: "ok" | "warning" | "critical" = "ok";
    if (stats.totalClients >= this.config.maxClients) {
      clientStatus = "critical";
    } else if (stats.totalClients >= clientThreshold) {
      clientStatus = "warning";
    }

    const checks = {
      clientCount: {
        status: clientStatus,
        value: stats.totalClients,
        threshold: this.config.maxClients,
      },
      uptime: {
        status: "ok" as const,
        value: stats.uptime,
      },
      heartbeat: {
        status: stats.heartbeatEnabled
          ? ("ok" as const)
          : ("disabled" as const),
        enabled: stats.heartbeatEnabled,
      },
    };

    // Determine overall status
    let overallStatus: "healthy" | "warning" | "critical" = "healthy";
    if (checks.clientCount.status === "critical") {
      overallStatus = "critical";
    } else if (checks.clientCount.status === "warning") {
      overallStatus = "warning";
    }

    return {
      status: overallStatus,
      checks,
    };
  }

  /**
   * Log service statistics
   */
  logStats(): void {
    const stats = this.getStats();
    const health = this.getHealthStatus();

    sseLogger.info("StatsManager", "Service statistics", {
      totalClients: stats.totalClients,
      totalUsers: stats.totalUsers,
      totalSessions: stats.totalSessions,
      uptime: Math.round(stats.uptime / 1000), // seconds
      heartbeatEnabled: stats.heartbeatEnabled,
      healthStatus: health.status,
    });
  }

  /**
   * Monitor and alert on thresholds
   */
  checkThresholds(): void {
    const health = this.getHealthStatus();

    if (health.status === "critical") {
      sseLogger.error("StatsManager", "Critical service status detected", {
        status: health.status,
        checks: health.checks,
      });
    } else if (health.status === "warning") {
      sseLogger.warn("StatsManager", "Warning service status detected", {
        status: health.status,
        checks: health.checks,
      });
    }
  }
}
