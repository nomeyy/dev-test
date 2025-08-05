/**
 * SSE Status Indicator Component
 * -----------------------------
 * Simple visual indicator for SSE connection status
 */

"use client";

interface SSEStatusIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export function SSEStatusIndicator({
  isConnected,
  className = "",
}: SSEStatusIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`h-3 w-3 rounded-full ${
          isConnected ? "animate-pulse bg-green-500" : "bg-red-500"
        }`}
        title={isConnected ? "Connected" : "Disconnected"}
      />
      <span
        className={`text-sm font-medium ${
          isConnected ? "text-green-700" : "text-red-700"
        }`}
      >
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
