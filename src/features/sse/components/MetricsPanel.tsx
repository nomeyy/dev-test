"use client";

import type { SSEMetrics } from "@/hooks/useSSEConnection";

interface MetricsPanelProps {
  metrics: SSEMetrics | null;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Metrics
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No metrics available
        </p>
      </div>
    );
  }

  const MetricCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Metrics
      </h2>

      <div className="space-y-4">
        {/* Connections */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Connections
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="Active Now"
              value={metrics.connections.active}
              subtitle="Currently connected"
            />
            <MetricCard
              title="Total (All-time)"
              value={metrics.connections.total}
              subtitle="Since server start"
            />
            <MetricCard
              title="Active Users"
              value={metrics.connections.byUser}
              subtitle="Unique users now"
            />
            <MetricCard
              title="Active Sessions"
              value={metrics.connections.bySession}
              subtitle="Unique sessions now"
            />
          </div>
        </div>

        {/* Events */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Events
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="Sent (Total)"
              value={metrics.events.sent}
              subtitle="All-time server events"
            />
            <MetricCard
              title="Received (Session)"
              value={metrics.events.received}
              subtitle="This connection only"
            />
            <MetricCard
              title="Failed"
              value={metrics.events.failed}
              subtitle="Total failed"
            />
            <MetricCard
              title="Rate"
              value={`${metrics.events.rate.toFixed(2)}/s`}
              subtitle="Events per second"
            />
          </div>
        </div>

        {/* Performance */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Performance
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="Memory"
              value={`${metrics.performance.memoryUsageMB.toFixed(1)} MB`}
              subtitle="Current usage"
            />
            <MetricCard
              title="Uptime"
              value={formatUptime(metrics.performance.uptime)}
              subtitle="Service uptime"
            />
            <MetricCard
              title="Latency"
              value={`${metrics.performance.averageLatency.toFixed(1)} ms`}
              subtitle="Average"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}