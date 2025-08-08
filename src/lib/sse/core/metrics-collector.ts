/**
 * Metrics Collector
 *
 * Collects, aggregates, and reports SSE system metrics
 */

import type {
  ClientId,
  SSEEvent,
  SSEMetrics,
  ConnectionStats,
  EventStats,
  PerformanceStats,
  HealthStats,
} from "../types";
import type { IConnectionManager } from "./connection-manager";
import type { IHealthMonitor } from "./health-monitor";

export interface IMetricsCollector {
  // Recording metrics
  recordConnection(clientId: ClientId): void;
  recordDisconnection(clientId: ClientId, duration: number): void;
  recordEventSent(event: SSEEvent, success: boolean): void;
  recordEventFailed(event: SSEEvent, error: string): void;
  recordHeartbeat(clientId: ClientId): void;

  // Retrieving metrics
  getMetrics(): SSEMetrics;
  getConnectionStats(): ConnectionStats;
  getEventStats(): EventStats;
  getPerformanceStats(): PerformanceStats;

  // Reset
  reset(): void;
}

interface EventMetrics {
  totalSent: number;
  totalFailed: number;
  byType: Map<string, number>;
  lastEventTime?: Date;
}

interface ConnectionMetrics {
  totalConnections: number;
  totalDisconnections: number;
  totalDuration: number;
  maxConcurrent: number;
  connectionTimes: number[];
}

interface PerformanceMetrics {
  eventDeliveryTimes: number[];
  memorySnapshots: number[];
  startTime: Date;
}

export class MetricsCollector implements IMetricsCollector {
  private eventMetrics: EventMetrics;
  private connectionMetrics: ConnectionMetrics;
  private performanceMetrics: PerformanceMetrics;
  private connectionStartTimes: Map<ClientId, number>;
  private eventRateWindow: number[] = [];
  private readonly RATE_WINDOW_SIZE = 60; // 60 seconds

  constructor(
    private readonly connectionManager: IConnectionManager,
    private readonly healthMonitor?: IHealthMonitor,
  ) {
    this.eventMetrics = {
      totalSent: 0,
      totalFailed: 0,
      byType: new Map(),
    };

    this.connectionMetrics = {
      totalConnections: 0,
      totalDisconnections: 0,
      totalDuration: 0,
      maxConcurrent: 0,
      connectionTimes: [],
    };

    this.performanceMetrics = {
      eventDeliveryTimes: [],
      memorySnapshots: [],
      startTime: new Date(),
    };

    this.connectionStartTimes = new Map();

    // Start periodic memory snapshots
    this.startMemoryMonitoring();
  }

  /**
   * Record a new connection
   */
  recordConnection(clientId: ClientId): void {
    this.connectionMetrics.totalConnections++;
    this.connectionStartTimes.set(clientId, Date.now());

    // Update max concurrent connections
    const currentConnections = this.connectionManager.getConnectionCount();
    if (currentConnections > this.connectionMetrics.maxConcurrent) {
      this.connectionMetrics.maxConcurrent = currentConnections;
    }
  }

  /**
   * Record a disconnection
   */
  recordDisconnection(clientId: ClientId, duration: number): void {
    this.connectionMetrics.totalDisconnections++;

    // Calculate connection duration if we have the start time
    const startTime = this.connectionStartTimes.get(clientId);
    if (startTime) {
      const actualDuration = Date.now() - startTime;
      this.connectionMetrics.totalDuration += actualDuration;
      this.connectionMetrics.connectionTimes.push(actualDuration);

      // Keep only last 1000 connection times for average calculation
      if (this.connectionMetrics.connectionTimes.length > 1000) {
        this.connectionMetrics.connectionTimes.shift();
      }

      this.connectionStartTimes.delete(clientId);
    } else {
      // Use provided duration if we don't have start time
      this.connectionMetrics.totalDuration += duration;
    }
  }

  /**
   * Record an event being sent
   */
  recordEventSent(event: SSEEvent, success: boolean): void {
    const eventStartTime = Date.now();

    if (success) {
      this.eventMetrics.totalSent++;
    } else {
      this.eventMetrics.totalFailed++;
    }

    // Track events by type
    const count = this.eventMetrics.byType.get(event.type) ?? 0;
    this.eventMetrics.byType.set(event.type, count + 1);

    this.eventMetrics.lastEventTime = new Date();

    // Track event delivery time
    const deliveryTime = Date.now() - eventStartTime;
    this.performanceMetrics.eventDeliveryTimes.push(deliveryTime);

    // Keep only last 1000 delivery times
    if (this.performanceMetrics.eventDeliveryTimes.length > 1000) {
      this.performanceMetrics.eventDeliveryTimes.shift();
    }

    // Update event rate
    this.updateEventRate();
  }

  /**
   * Record a failed event
   */
  recordEventFailed(event: SSEEvent, error: string): void {
    this.eventMetrics.totalFailed++;
    console.error(`Event failed: ${event.type}`, error);
  }

  /**
   * Record a heartbeat
   */
  recordHeartbeat(): void {
    // This can be used to track heartbeat-specific metrics
    const heartbeatType = "system:heartbeat";
    const count = this.eventMetrics.byType.get(heartbeatType) ?? 0;
    this.eventMetrics.byType.set(heartbeatType, count + 1);
  }

  /**
   * Get all metrics
   */
  getMetrics(): SSEMetrics {
    return {
      connections: this.getConnectionStats(),
      events: this.getEventStats(),
      health: this.getHealthStats(),
      performance: this.getPerformanceStats(),
      timestamp: new Date(),
    };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    const connections = this.connectionManager.getAllConnections();
    const byUser = new Map<string, number>();
    const bySession = new Map<string, number>();

    // Count connections by user and session
    for (const [_, connection] of connections) {
      if (connection.userId) {
        byUser.set(connection.userId, (byUser.get(connection.userId) ?? 0) + 1);
      }
      if (connection.sessionId) {
        bySession.set(
          connection.sessionId,
          (bySession.get(connection.sessionId) ?? 0) + 1,
        );
      }
    }

    // Calculate average duration
    const averageDuration =
      this.connectionMetrics.connectionTimes.length > 0
        ? this.connectionMetrics.connectionTimes.reduce((a, b) => a + b, 0) /
          this.connectionMetrics.connectionTimes.length
        : 0;

    return {
      active: connections.size,
      total: this.connectionMetrics.totalConnections,
      byUser,
      bySession,
      averageDuration,
    };
  }

  /**
   * Get event statistics
   */
  getEventStats(): EventStats {
    return {
      sent: this.eventMetrics.totalSent,
      failed: this.eventMetrics.totalFailed,
      rate: this.calculateEventRate(),
      byType: new Map(this.eventMetrics.byType),
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const avgEventDeliveryMs =
      this.performanceMetrics.eventDeliveryTimes.length > 0
        ? this.performanceMetrics.eventDeliveryTimes.reduce(
            (a, b) => a + b,
            0,
          ) / this.performanceMetrics.eventDeliveryTimes.length
        : 0;

    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const avgMemory =
      this.performanceMetrics.memorySnapshots.length > 0
        ? this.performanceMetrics.memorySnapshots.reduce((a, b) => a + b, 0) /
          this.performanceMetrics.memorySnapshots.length
        : currentMemory;

    const uptime = Date.now() - this.performanceMetrics.startTime.getTime();

    // Get CPU usage (simplified - in production you might want to use more sophisticated monitoring)
    const cpuUsage = process.cpuUsage();
    const cpuPercent =
      ((cpuUsage.user + cpuUsage.system) / 1000000 / (uptime / 1000)) * 100;

    return {
      avgEventDeliveryMs,
      memoryUsageMB: avgMemory,
      cpuUsage: Math.min(cpuPercent, 100), // Cap at 100%
      uptime,
    };
  }

  /**
   * Get health statistics
   */
  private getHealthStats(): HealthStats {
    if (this.healthMonitor) {
      return this.healthMonitor.getStats();
    }

    // Return default stats if no health monitor
    return {
      totalHeartbeatsSent: 0,
      totalHeartbeatsReceived: 0,
      clientTimeouts: 0,
      unhealthyConnections: 0,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.eventMetrics = {
      totalSent: 0,
      totalFailed: 0,
      byType: new Map(),
    };

    this.connectionMetrics = {
      totalConnections: 0,
      totalDisconnections: 0,
      totalDuration: 0,
      maxConcurrent: 0,
      connectionTimes: [],
    };

    this.performanceMetrics = {
      eventDeliveryTimes: [],
      memorySnapshots: [],
      startTime: new Date(),
    };

    this.connectionStartTimes.clear();
    this.eventRateWindow = [];
  }

  /**
   * Update event rate tracking
   */
  private updateEventRate(): void {
    const now = Date.now();
    this.eventRateWindow.push(now);

    // Remove events older than window size
    const cutoff = now - this.RATE_WINDOW_SIZE * 1000;
    this.eventRateWindow = this.eventRateWindow.filter((time) => time > cutoff);
  }

  /**
   * Calculate current event rate
   */
  private calculateEventRate(): number {
    const now = Date.now();
    const cutoff = now - this.RATE_WINDOW_SIZE * 1000;
    const recentEvents = this.eventRateWindow.filter((time) => time > cutoff);

    // Return events per second
    return recentEvents.length / this.RATE_WINDOW_SIZE;
  }

  /**
   * Start periodic memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
      this.performanceMetrics.memorySnapshots.push(memoryMB);

      // Keep only last 60 snapshots (1 hour if taken every minute)
      if (this.performanceMetrics.memorySnapshots.length > 60) {
        this.performanceMetrics.memorySnapshots.shift();
      }
    }, 60000); // Every minute
  }

  /**
   * Get detailed metrics report
   */
  getDetailedReport(): {
    summary: SSEMetrics;
    analysis: {
      connectionHealth: string;
      eventThroughput: string;
      performanceStatus: string;
      recommendations: string[];
    };
  } {
    const metrics = this.getMetrics();
    const analysis = {
      connectionHealth: this.analyzeConnectionHealth(metrics.connections),
      eventThroughput: this.analyzeEventThroughput(metrics.events),
      performanceStatus: this.analyzePerformance(metrics.performance),
      recommendations: this.generateRecommendations(metrics),
    };

    return {
      summary: metrics,
      analysis,
    };
  }

  /**
   * Analyze connection health
   */
  private analyzeConnectionHealth(stats: ConnectionStats): string {
    if (stats.active === 0) {
      return "No active connections";
    }

    const utilizationPercent = (stats.active / 10000) * 100; // Assuming max 10k connections

    if (utilizationPercent > 80) {
      return "Critical: Near maximum capacity";
    } else if (utilizationPercent > 60) {
      return "Warning: High connection load";
    } else {
      return "Healthy: Normal connection load";
    }
  }

  /**
   * Analyze event throughput
   */
  private analyzeEventThroughput(stats: EventStats): string {
    const failureRate = stats.sent > 0 ? (stats.failed / stats.sent) * 100 : 0;

    if (failureRate > 10) {
      return "Critical: High failure rate";
    } else if (failureRate > 5) {
      return "Warning: Elevated failure rate";
    } else if (stats.rate > 100) {
      return "Warning: Very high event rate";
    } else {
      return "Healthy: Normal event throughput";
    }
  }

  /**
   * Analyze performance
   */
  private analyzePerformance(stats: PerformanceStats): string {
    if (stats.memoryUsageMB > 512) {
      return "Critical: High memory usage";
    } else if (stats.cpuUsage > 80) {
      return "Critical: High CPU usage";
    } else if (stats.avgEventDeliveryMs > 100) {
      return "Warning: Slow event delivery";
    } else {
      return "Healthy: Good performance";
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: SSEMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.connections.active > 5000) {
      recommendations.push(
        "Consider implementing connection pooling or load balancing",
      );
    }

    if (metrics.events.failed > metrics.events.sent * 0.05) {
      recommendations.push("Investigate high event failure rate");
    }

    if (metrics.performance.memoryUsageMB > 256) {
      recommendations.push("Monitor memory usage and consider optimization");
    }

    if (metrics.performance.avgEventDeliveryMs > 50) {
      recommendations.push(
        "Optimize event delivery pipeline for better latency",
      );
    }

    return recommendations;
  }
}
