"use client";

import type { SSEHealth } from "@/hooks/useSSEConnection";

interface HealthMonitorProps {
  health: SSEHealth;
  connected: boolean;
}

export function HealthMonitor({ health, connected }: HealthMonitorProps) {
  const getHealthColor = (status: SSEHealth["status"]) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "degraded":
        return "text-orange-600 bg-orange-100";
      case "unhealthy":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getHealthIcon = (status: SSEHealth["status"]) => {
    switch (status) {
      case "healthy":
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case "degraded":
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
      case "unhealthy":
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    if (!connected) {
      recommendations.push("Connect to the SSE service to start monitoring");
    }
    
    if (health.status === "degraded") {
      recommendations.push("Check network connectivity");
      recommendations.push("Monitor for frequent disconnections");
    }
    
    if (health.status === "unhealthy") {
      recommendations.push("Verify the SSE service is running");
      recommendations.push("Check server logs for errors");
    }
    
    if (health.reconnectAttempts > 3) {
      recommendations.push("Multiple reconnect attempts detected - check server stability");
    }
    
    if (health.lastHeartbeat && Date.now() - health.lastHeartbeat > 60000) {
      recommendations.push("No heartbeat received for over 1 minute");
    }
    
    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Health Monitor
      </h2>

      <div className="space-y-4">
        {/* Health Status */}
        <div className="flex items-center justify-center">
          <div className={`p-4 rounded-full ${getHealthColor(health.status)}`}>
            {getHealthIcon(health.status)}
          </div>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {health.status}
          </p>
          {connected && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connection Uptime: {formatUptime(health.connectionUptime)}
            </p>
          )}
        </div>

        {/* Health Details */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Heartbeat</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatTimestamp(health.lastHeartbeat)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Reconnect Attempts</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {health.reconnectAttempts}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recommendations
            </p>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <svg className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}