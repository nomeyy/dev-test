"use client";

import type { SSEHealth } from "@/hooks/useSSEConnection";

interface ConnectionStatusProps {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  health: SSEHealth;
}

export function ConnectionStatus({
  connected,
  connecting,
  error,
  health,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (connecting) return "bg-yellow-100 border-yellow-300 text-yellow-800";
    if (connected && health.status === "healthy") return "bg-green-100 border-green-300 text-green-800";
    if (connected && health.status === "degraded") return "bg-orange-100 border-orange-300 text-orange-800";
    if (error || health.status === "unhealthy") return "bg-red-100 border-red-300 text-red-800";
    return "bg-gray-100 border-gray-300 text-gray-800";
  };

  const getStatusText = () => {
    if (connecting) return "Connecting...";
    if (connected && health.status === "healthy") return "Connected";
    if (connected && health.status === "degraded") return "Connected (Degraded)";
    if (error) return `Error: ${error}`;
    if (health.status === "unhealthy") return "Disconnected (Unhealthy)";
    return "Disconnected";
  };

  const getStatusIcon = () => {
    if (connecting) {
      return (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    if (connected && health.status === "healthy") {
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      );
    }
    if (error || health.status === "unhealthy") {
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );
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

  return (
    <div className={`border rounded-lg p-4 mb-6 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="font-semibold">{getStatusText()}</p>
            {connected && health.connectionUptime > 0 && (
              <p className="text-sm opacity-75">
                Uptime: {formatUptime(health.connectionUptime)}
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right text-sm">
          {health.lastHeartbeat && (
            <p className="opacity-75">
              Last heartbeat: {new Date(health.lastHeartbeat).toLocaleTimeString()}
            </p>
          )}
          {health.reconnectAttempts > 0 && (
            <p className="opacity-75">
              Reconnect attempts: {health.reconnectAttempts}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}