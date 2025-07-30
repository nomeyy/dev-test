/**
 * SSE monitoring utilities for tracking connection counts and event throughput
 */

import { logger } from "@/utils/logging";
import type { SSEManager } from "../services/interfaces";

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  metricsInterval: number; // How often to log metrics (ms)
  alertThresholds: {
    maxConnections: number;
    maxEventThroughput: number; // events per minute
    maxErrorRate: number; // percentage
    maxResponseTime: number; // milliseconds
  };
  enableDetailedLogging: boolean;
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  metricsInterval: 5 * 60 * 1000, // 5 minutes
  alertThresholds: {
    maxConnections: 10000,
    maxEventThroughput: 1000, // events per minute
    maxErrorRate: 5, // 5%
    maxResponseTime: 1000, // 1 second
  },
  enableDetailedLogging: true,
};

/**
 * Monitoring metrics interface
 */
export interface MonitoringMetrics {
  timestamp: string;
  connections: {
    active: number;
    total: number;
    byUser: Record<string, number>;
    bySession: Record<string, number>;
    averageDuration: number;
  };
  events: {
    totalSent: number;
    throughputPerMinute: number;
    throughputPerHour: number;
    failedEvents: number;
    successRate: number;
  };
  errors: {
    total: number;
    connectionErrors: number;
    eventErrors: number;
    heartbeatErrors: number;
    storeErrors: number;
    streamErrors: number;
    errorRate: number;
  };
  performance: {
    averageResponseTime: number;
    slowOperations: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  alerts: MonitoringAlert[];
}

/**
 * Monitoring alert interface
 */
export interface MonitoringAlert {
  type: "warning" | "error" | "critical";
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
}

/**
 * SSE monitoring service
 */
export class SSEMonitoringService {
  private config: MonitoringConfig;
  private contextLogger = logger.createContextLogger("SSEMonitoring");
  private metricsInterval?: NodeJS.Timeout;
  private alerts: MonitoringAlert[] = [];
  private lastMetrics?: MonitoringMetrics;

  constructor(
    private sseManager: SSEManager,
    config?: Partial<MonitoringConfig>,
  ) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
    this.startMonitoring();
  }

  /**
   * Start monitoring with periodic metrics collection
   */
  startMonitoring(): void {
    this.contextLogger.info("Starting SSE monitoring", {
      metricsInterval: this.config.metricsInterval,
      alertThresholds: this.config.alertThresholds,
    });

    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.processMetrics(metrics);
        this.lastMetrics = metrics;
      } catch (error) {
        this.contextLogger.error("Failed to collect monitoring metrics", error);
      }
    }, this.config.metricsInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    this.contextLogger.info("SSE monitoring stopped");
  }

  /**
   * Collect current metrics from SSE manager
   */
  async collectMetrics(): Promise<MonitoringMetrics> {
    // TODO: Implement getMetrics method in SSEManager
    const managerMetrics = {
      totalConnections: 0,
      totalEvents: 0,
      totalErrors: 0,
      eventsSent: 0,
      eventsDelivered: 0,
      eventErrors: 0,
      connectionErrors: 0,
      heartbeatErrors: 0,
      storeErrors: 0,
      streamErrors: 0,
      performanceMetrics: {
        averageConnectionDuration: 0,
        averageEventProcessingTime: 0,
        eventThroughputPerMinute: 0,
      },
    };
    const activeConnections = await this.sseManager.getActiveConnections();

    // Calculate connection metrics
    const connectionsByUser: Record<string, number> = {};
    const connectionsBySession: Record<string, number> = {};

    for (const connection of activeConnections) {
      if (connection.userId) {
        connectionsByUser[connection.userId] =
          (connectionsByUser[connection.userId] || 0) + 1;
      }
      if (connection.sessionId) {
        connectionsBySession[connection.sessionId] =
          (connectionsBySession[connection.sessionId] || 0) + 1;
      }
    }

    // Calculate error rate
    const totalOperations =
      managerMetrics.totalConnections + managerMetrics.totalEvents;
    const errorRate =
      totalOperations > 0
        ? (managerMetrics.totalErrors / totalOperations) * 100
        : 0;

    // Calculate event success rate
    const eventSuccessRate =
      managerMetrics.totalEvents > 0
        ? ((managerMetrics.totalEvents - managerMetrics.eventErrors) /
            managerMetrics.totalEvents) *
          100
        : 100;

    const metrics: MonitoringMetrics = {
      timestamp: new Date().toISOString(),
      connections: {
        active: activeConnections.length,
        total: managerMetrics.totalConnections,
        byUser: connectionsByUser,
        bySession: connectionsBySession,
        averageDuration:
          managerMetrics.performanceMetrics?.averageConnectionDuration || 0,
      },
      events: {
        totalSent: managerMetrics.totalEvents,
        throughputPerMinute:
          managerMetrics.performanceMetrics?.eventThroughputPerMinute || 0,
        throughputPerHour: 0, // Would need to track this separately
        failedEvents: managerMetrics.eventErrors,
        successRate: eventSuccessRate,
      },
      errors: {
        total: managerMetrics.totalErrors,
        connectionErrors: managerMetrics.connectionErrors,
        eventErrors: managerMetrics.eventErrors,
        heartbeatErrors: managerMetrics.heartbeatErrors || 0,
        storeErrors: managerMetrics.storeErrors || 0,
        streamErrors: managerMetrics.streamErrors || 0,
        errorRate,
      },
      performance: {
        averageResponseTime: 0, // Would need to track this separately
        slowOperations: 0, // Would need to track this separately
        memoryUsage: process.memoryUsage(),
      },
      alerts: [...this.alerts],
    };

    return metrics;
  }

  /**
   * Process metrics and generate alerts
   */
  private processMetrics(metrics: MonitoringMetrics): void {
    // Clear old alerts
    this.alerts = [];

    // Check connection count threshold
    if (
      metrics.connections.active > this.config.alertThresholds.maxConnections
    ) {
      this.addAlert(
        "warning",
        "High connection count",
        "connections.active",
        metrics.connections.active,
        this.config.alertThresholds.maxConnections,
      );
    }

    // Check event throughput threshold
    if (
      metrics.events.throughputPerMinute >
      this.config.alertThresholds.maxEventThroughput
    ) {
      this.addAlert(
        "warning",
        "High event throughput",
        "events.throughputPerMinute",
        metrics.events.throughputPerMinute,
        this.config.alertThresholds.maxEventThroughput,
      );
    }

    // Check error rate threshold
    if (metrics.errors.errorRate > this.config.alertThresholds.maxErrorRate) {
      this.addAlert(
        "error",
        "High error rate",
        "errors.errorRate",
        metrics.errors.errorRate,
        this.config.alertThresholds.maxErrorRate,
      );
    }

    // Log metrics
    if (this.config.enableDetailedLogging) {
      this.contextLogger.info("SSE Monitoring Metrics", {
        activeConnections: metrics.connections.active,
        totalConnections: metrics.connections.total,
        eventThroughput: metrics.events.throughputPerMinute,
        errorRate: metrics.errors.errorRate,
        totalErrors: metrics.errors.total,
        memoryUsage: metrics.performance.memoryUsage,
        alerts: metrics.alerts.length,
      });
    }

    // Log alerts
    for (const alert of this.alerts) {
      this.contextLogger.warn("SSE Monitoring Alert", {
        type: alert.type,
        message: alert.message,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
      });
    }
  }

  /**
   * Add a monitoring alert
   */
  private addAlert(
    type: MonitoringAlert["type"],
    message: string,
    metric: string,
    value: number,
    threshold: number,
  ): void {
    const alert: MonitoringAlert = {
      type,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(alert);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MonitoringMetrics | undefined {
    return this.lastMetrics;
  }

  /**
   * Get current alerts
   */
  getCurrentAlerts(): MonitoringAlert[] {
    return [...this.alerts];
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.contextLogger.info("Monitoring configuration updated", {
      newConfig: this.config,
    });

    // Restart monitoring with new config
    this.stopMonitoring();
    this.startMonitoring();
  }

  /**
   * Generate monitoring report
   */
  generateReport(): string {
    if (!this.lastMetrics) {
      return "No metrics available";
    }

    const metrics = this.lastMetrics;

    return `
SSE Monitoring Report - ${metrics.timestamp}

CONNECTIONS:
- Active: ${metrics.connections.active}
- Total: ${metrics.connections.total}
- Average Duration: ${Math.round(metrics.connections.averageDuration / 1000)}s
- Unique Users: ${Object.keys(metrics.connections.byUser).length}
- Unique Sessions: ${Object.keys(metrics.connections.bySession).length}

EVENTS:
- Total Sent: ${metrics.events.totalSent}
- Throughput: ${metrics.events.throughputPerMinute}/min
- Failed: ${metrics.events.failedEvents}
- Success Rate: ${metrics.events.successRate.toFixed(2)}%

ERRORS:
- Total: ${metrics.errors.total}
- Connection Errors: ${metrics.errors.connectionErrors}
- Event Errors: ${metrics.errors.eventErrors}
- Heartbeat Errors: ${metrics.errors.heartbeatErrors}
- Store Errors: ${metrics.errors.storeErrors}
- Stream Errors: ${metrics.errors.streamErrors}
- Error Rate: ${metrics.errors.errorRate.toFixed(2)}%

PERFORMANCE:
- Memory Usage: ${Math.round((metrics.performance.memoryUsage?.heapUsed || 0) / 1024 / 1024)}MB
- Memory Total: ${Math.round((metrics.performance.memoryUsage?.heapTotal || 0) / 1024 / 1024)}MB

ALERTS: ${metrics.alerts.length}
${metrics.alerts.map((alert) => `- ${alert.type.toUpperCase()}: ${alert.message} (${alert.value} > ${alert.threshold})`).join("\n")}
    `.trim();
  }
}

/**
 * Create a monitoring service instance
 */
export function createSSEMonitoring(
  sseManager: SSEManager,
  config?: Partial<MonitoringConfig>,
): SSEMonitoringService {
  return new SSEMonitoringService(sseManager, config);
}

/**
 * Health check function for SSE service
 */
export async function performHealthCheck(sseManager: SSEManager): Promise<{
  healthy: boolean;
  issues: string[];
  metrics: {
    activeConnections: number;
    totalErrors: number;
    errorRate: number;
  };
}> {
  const issues: string[] = [];

  try {
    // TODO: Implement getMetrics method in SSEManager
    const metrics = {
      totalErrors: 0,
      totalConnections: 0,
      totalEvents: 0,
      lastMetricsLog: new Date(),
    };
    const activeConnections = await sseManager.getActiveConnections();

    // Check for high error rates
    const totalOperations = metrics.totalConnections + metrics.totalEvents;
    const errorRate =
      totalOperations > 0 ? (metrics.totalErrors / totalOperations) * 100 : 0;

    if (errorRate > 10) {
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    // Check for excessive connections
    if (activeConnections.length > 5000) {
      issues.push(`High connection count: ${activeConnections.length}`);
    }

    // Check for recent errors
    const recentErrorThreshold = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    if (
      metrics.lastMetricsLog &&
      metrics.lastMetricsLog.getTime() < recentErrorThreshold
    ) {
      issues.push("No recent metrics updates");
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: {
        activeConnections: activeConnections.length,
        totalErrors: metrics.totalErrors,
        errorRate,
      },
    };
  } catch (error) {
    issues.push(
      `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );

    return {
      healthy: false,
      issues,
      metrics: {
        activeConnections: 0,
        totalErrors: 0,
        errorRate: 0,
      },
    };
  }
}
