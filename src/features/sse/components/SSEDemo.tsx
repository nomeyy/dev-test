"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useSSE,
  useSSEEvent,
  useSSEEvents,
  type SSEEventData,
} from "../hooks/useSSE";
// Simple button component for demo
const Button = ({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline";
}) => {
  const baseClasses =
    "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  const variantClasses =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
      : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
};

/**
 * Demo component to showcase SSE functionality
 * Displays connection status, recent events, and provides test controls
 */
export function SSEDemo() {
  const [messages, setMessages] = useState<SSEEventData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSSEReady, setIsSSEReady] = useState(false);

  // Handle all events and add to message history
  const handleEvent = useCallback((data: unknown, eventType: string) => {
    const newMessage: SSEEventData = {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [newMessage, ...prev.slice(0, 9)]); // Keep last 10 messages
  }, []);

  // Use SSE hook with optimized settings - make it non-blocking for page load
  const sse = useSSE("/api/sse", {
    debug: false, // Disable debug to reduce noise
    autoReconnect: true,
    reconnectDelay: 5000, // Reduced back to 5 seconds - more responsive
    maxReconnectAttempts: 3, // Keep reasonable retry limit
  });

  // Mark SSE as ready when it connects (non-blocking)
  useEffect(() => {
    if (sse.connectionState === "connected") {
      setIsSSEReady(true);
    }
  }, [sse.connectionState]);

  // Listen for all events except heartbeat (which we handle separately)
  useSSEEvents(
    {
      system_alert: (data) => handleEvent(data, "system_alert"),
      resource_update: (data) => handleEvent(data, "resource_update"),
      progress_update: (data) => handleEvent(data, "progress_update"),
      connected: (data) => handleEvent(data, "connected"),
      test_notification: (data) => handleEvent(data, "test_notification"),
      custom_event: (data) => handleEvent(data, "custom_event"),
      // Add any other event types here as needed
    },
    sse,
  );

  // Listen for heartbeat (optional, mainly for debugging) - but don't show in UI
  useSSEEvent(
    "heartbeat",
    () => {
      // Just update last activity, but don't add to message history
      // Heartbeat events are just for keeping connection alive
    },
    sse,
  );

  // Simulate sending a test notification
  const sendTestNotification = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test_notification",
          message: "This is a test notification from the demo!",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test notification:", response.status);
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  // Connection status indicator
  const getStatusColor = () => {
    switch (sse.connectionState) {
      case "connected":
        return "bg-green-500";
      case "connecting":
      case "reconnecting":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = () => {
    switch (sse.connectionState) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "reconnecting":
        return "Reconnecting...";
      case "error":
        return "Error";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Server-Sent Events Demo
        </h1>

        {/* Connection Status */}
        <div className="mb-6 flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
          <span className="font-medium">{getStatusText()}</span>
          {sse.connectionState === "connected" && (
            <span
              className="text-sm text-green-600"
              title={sse.stats.connectionId || ""}
            >
              (Stable - ID: {sse.stats.connectionId?.slice(0, 8)}...)
            </span>
          )}
          {!isSSEReady && sse.connectionState === "connecting" && (
            <span className="text-sm text-blue-600">
              (Loading SSE connection...)
            </span>
          )}
          {sse.error && (
            <span className="text-sm text-red-600">({sse.error})</span>
          )}
        </div>

        {/* Connection Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Connection ID</div>
            <div
              className="font-mono text-xs text-black"
              title={sse.stats.connectionId || ""}
            >
              {sse.stats.connectionId?.slice(0, 8) ?? "None"}...
            </div>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Events Received</div>
            <div className="font-semibold text-black">
              {sse.stats.eventCount}
            </div>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Reconnects</div>
            <div className="font-semibold text-black">
              {sse.stats.reconnectCount}
            </div>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Connected Since</div>
            <div className="text-xs text-black">
              {sse.stats.connectedAt?.toLocaleTimeString() ?? "N/A"}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            onClick={sendTestNotification}
            disabled={sse.connectionState !== "connected"}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Send Test Event
          </Button>
          <Button
            onClick={sse.reconnect}
            disabled={sse.connectionState === "connecting"}
            variant="outline"
          >
            Reconnect
          </Button>
          <Button
            onClick={sse.disconnect}
            disabled={sse.connectionState === "disconnected"}
            variant="outline"
          >
            Disconnect
          </Button>
          <Button onClick={() => setIsExpanded(!isExpanded)} variant="outline">
            {isExpanded ? "Collapse" : "Expand"} Details
          </Button>
        </div>

        {/* Last Event Display */}
        {sse.lastEvent && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-blue-900">Latest Event</h3>
            <div className="space-y-1 text-black">
              <div className="text-sm">
                <span className="font-medium">Event:</span>{" "}
                {sse.lastEvent.event}
              </div>
              <div className="text-sm">
                <span className="font-medium">Time:</span>{" "}
                {sse.lastEvent.timestamp}
              </div>
              <div className="text-sm">
                <span className="font-medium">Data:</span>
                <pre className="mt-1 overflow-x-auto rounded border bg-white p-2 text-xs">
                  {JSON.stringify(sse.lastEvent.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Event History */}
        {isExpanded && (
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold text-gray-900">Event History</h3>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500">No events received yet</p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className="rounded border bg-white p-3 text-sm"
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <span className="font-medium text-blue-600">
                        {message.event}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp!).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="overflow-x-auto text-xs text-gray-700">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          How to Test SSE
        </h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            1. <strong>Connection Status:</strong> Check the indicator above to
            see if you&apos;re connected
          </p>
          <p>
            2. <strong>Test Event:</strong> Click &quot;Send Test Event&quot; to
            trigger a sample notification
          </p>
          <p>
            3. <strong>Heartbeat:</strong> Connection stays alive with
            heartbeats every 30 seconds (hidden from UI)
          </p>
          <p>
            4. <strong>Reconnection:</strong> Auto-reconnects with 5-second
            delays and exponential backoff
          </p>
          <p>
            5. <strong>Multiple Tabs:</strong> Each tab maintains its own
            connection - broadcast events reach all tabs
          </p>
        </div>
      </div>
    </div>
  );
}
