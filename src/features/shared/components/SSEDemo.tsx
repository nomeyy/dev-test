"use client";

import { useState } from "react";
import { useSSE } from "@/lib/sse/hooks/useSSE";
import { SSEEventType } from "@/lib/sse/types";
import { api } from "@/trpc/react";
import { Button } from "./ui/button";

/**
 * SSE Demo Component
 * Demonstrates the SSE functionality with real-time events and testing capabilities
 */
export function SSEDemo() {
  const [testMessage, setTestMessage] = useState("Hello from SSE!");
  const [isLoading, setIsLoading] = useState(false);

  // Use SSE hook with debug enabled
  const sse = useSSE({
    debug: true,
    maxHistorySize: 20,
  });

  // tRPC mutations for sending test events
  const sendTestMessage = api.sse.sendTestMessage.useMutation();
  const getStats = api.sse.getPublicStats.useQuery(undefined, {
    refetchInterval: false, // Disable automatic polling to save Redis requests
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  /**
   * Send a test message via tRPC
   */
  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) return;

    setIsLoading(true);
    try {
      await sendTestMessage.mutateAsync({
        message: testMessage,
        broadcast: true,
      });
    } catch (error) {
      console.error("Failed to send test message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  /**
   * Get status indicator color
   */
  const getStatusColor = () => {
    switch (sse.status) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "reconnecting":
        return "text-orange-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  /**
   * Get status indicator dot color
   */
  const getStatusDotColor = () => {
    switch (sse.status) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "reconnecting":
        return "bg-orange-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            SSE Connection Status
          </h2>
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${getStatusDotColor()}`}
            ></div>
            <span className={`font-medium capitalize ${getStatusColor()}`}>
              {sse.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="font-medium text-gray-600">Connection ID</div>
            <div className="font-mono text-xs text-gray-800">
              {sse.connectionId || "Not connected"}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-600">Total Events</div>
            <div className="text-lg font-semibold text-gray-900">
              {sse.eventHistory.length}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-600">Active Connections</div>
            <div className="flex items-center space-x-2">
              <div className="text-lg font-semibold text-gray-900">
                {getStats.data?.totalConnections ?? 0}
              </div>
              <Button
                onClick={() => getStats.refetch()}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900"
                disabled={getStats.isRefetching}
              >
                🔄
              </Button>
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-600">Last Event</div>
            <div className="text-xs text-gray-800">
              {sse.lastEvent ? formatTime(sse.lastEvent.timestamp) : "None"}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {sse.error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <div className="font-medium text-red-800">Connection Error</div>
            <div className="text-sm text-red-600">{sse.error.message}</div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="mt-4 flex space-x-2">
          <Button
            onClick={sse.connect}
            disabled={sse.isConnected || sse.isConnecting}
            size="sm"
            variant="outline"
          >
            Connect
          </Button>
          <Button
            onClick={sse.disconnect}
            disabled={sse.isDisconnected}
            size="sm"
            variant="outline"
          >
            Disconnect
          </Button>
          <Button onClick={sse.clearHistory} size="sm" variant="outline">
            Clear History
          </Button>
        </div>
      </div>

      {/* Test Message Sender */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Send Test Message
        </h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter test message..."
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendTestMessage();
              }
            }}
          />
          <Button
            onClick={handleSendTestMessage}
            disabled={isLoading || !testMessage.trim()}
            className="px-6"
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
        {sendTestMessage.error && (
          <div className="mt-2 text-sm text-red-600">
            Error: {sendTestMessage.error.message}
          </div>
        )}
      </div>

      {/* Latest Event Display */}
      {sse.lastEvent && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Latest Event
          </h3>
          <div className="rounded-md bg-gray-50 p-3">
            <div className="mb-2 flex items-start justify-between">
              <span className="font-medium text-blue-600">
                {sse.lastEvent.type}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(sse.lastEvent.timestamp)}
              </span>
            </div>
            <pre className="text-sm whitespace-pre-wrap text-gray-700">
              {JSON.stringify(sse.lastEvent.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Event History */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Event History
        </h3>
        {sse.eventHistory.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No events received yet. Send a test message to see events appear
            here.
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {sse.eventHistory.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                className={`rounded-md border-l-4 p-3 ${
                  event.type === SSEEventType.HEARTBEAT
                    ? "border-gray-300 bg-gray-50"
                    : event.type === SSEEventType.CONNECTED
                      ? "border-green-400 bg-green-50"
                      : event.type === SSEEventType.TEST_MESSAGE
                        ? "border-blue-400 bg-blue-50"
                        : event.type === SSEEventType.NOTIFICATION
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-purple-400 bg-purple-50"
                }`}
              >
                <div className="mb-1 flex items-start justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {event.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                {event.type !== SSEEventType.HEARTBEAT && (
                  <div className="text-sm text-gray-700">
                    {typeof event.data === "string"
                      ? event.data
                      : event.data?.message ||
                        JSON.stringify(event.data, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Statistics */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Event Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Object.values(SSEEventType).map((eventType) => {
            const count = sse.getEventsByType(eventType).length;
            return (
              <div
                key={eventType}
                className="rounded-md bg-gray-50 p-3 text-center"
              >
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {eventType.replace("_", " ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
