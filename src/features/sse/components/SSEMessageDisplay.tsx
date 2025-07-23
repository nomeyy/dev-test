"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { useSSE } from "../hooks/useSSE";
import type { SSEEvent } from "../types";

interface SSEMessageDisplayProps {
  url?: string;
  showConnectionStatus?: boolean;
  showEventHistory?: boolean;
  maxHistoryItems?: number;
  className?: string;
}

export function SSEMessageDisplay({
  url = "/api/sse",
  showConnectionStatus = true,
  showEventHistory = true,
  maxHistoryItems = 10,
  className = "",
}: SSEMessageDisplayProps) {
  const [eventHistory, setEventHistory] = useState<SSEEvent[]>([]);

  const {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    reconnectAttempts,
    connect,
    disconnect,
  } = useSSE(url, {
    onMessage: (event) => {
      setEventHistory((prev) => {
        const newHistory = [event, ...prev];
        return newHistory.slice(0, maxHistoryItems);
      });
    },
    onConnect: () => {
      console.log("SSE connected");
    },
    onDisconnect: () => {
      console.log("SSE disconnected");
    },
    onError: (error) => {
      console.error("SSE error:", error);
    },
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get event display color based on event type
  const getEventColor = (event: string) => {
    switch (event) {
      case "notification":
        return "text-blue-600";
      case "status_update":
        return "text-green-600";
      case "data_sync":
        return "text-purple-600";
      case "system_alert":
        return "text-orange-600";
      case "heartbeat":
        return "text-gray-400";
      default:
        return "text-gray-800";
    }
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    if (isConnected) return "text-green-600";
    if (isConnecting) return "text-yellow-600";
    if (error) return "text-red-600";
    return "text-gray-600";
  };

  // Get connection status text
  const getConnectionStatusText = () => {
    if (isConnected) return "Connected";
    if (isConnecting) return "Connecting...";
    if (error) return `Error: ${error}`;
    return "Disconnected";
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="mb-4 rounded-md bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-500"}`}
              />
              <span className={`font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
              {reconnectAttempts > 0 && (
                <span className="text-sm text-gray-500">
                  (Reconnect attempts: {reconnectAttempts})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={connect}
                disabled={isConnected || isConnecting}
              >
                Connect
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={disconnect}
                disabled={!isConnected}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Latest Message */}
      {lastEvent && (
        <div className="mb-4 rounded-md border bg-blue-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className={`font-medium ${getEventColor(lastEvent.event)}`}>
              Latest: {lastEvent.event}
            </span>
            <span className="text-sm text-gray-500">
              {formatTimestamp(lastEvent.timestamp)}
            </span>
          </div>
          <div className="text-sm">
            <pre className="break-words whitespace-pre-wrap">
              {JSON.stringify(lastEvent.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Event History */}
      {showEventHistory && eventHistory.length > 0 && (
        <div>
          <h3 className="mb-2 text-lg font-medium">Event History</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {eventHistory.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className="rounded border p-2 text-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={`font-medium ${getEventColor(event.event)}`}>
                    {event.event}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                {event.data && (
                  <div className="text-xs text-gray-600">
                    <pre className="break-words whitespace-pre-wrap">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Events Message */}
      {showEventHistory && eventHistory.length === 0 && isConnected && (
        <div className="py-4 text-center text-gray-500">
          No events received yet. Waiting for messages...
        </div>
      )}

      {/* Connection Info */}
      <div className="mt-4 border-t pt-4 text-xs text-gray-500">
        <div>SSE Endpoint: {url}</div>
        <div>Total Events: {eventHistory.length}</div>
      </div>
    </div>
  );
}
