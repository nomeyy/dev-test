"use client";

import { useState, useEffect, useRef } from "react";
// Simple button component to avoid dependency issues
const Button = ({
  onClick,
  disabled,
  variant = "default",
  size = "default",
  className = "",
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "default";
  size?: "sm" | "default" | "lg";
  className?: string;
  children: React.ReactNode;
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    default: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
  };
  const sizeClasses = {
    sm: "h-8 px-3 py-1 text-xs",
    default: "h-9 px-4 py-2",
    lg: "h-10 px-6 py-2",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};

interface SSEMessage {
  id: string;
  timestamp: string;
  event: string;
  data: unknown;
  raw?: string;
}

interface ConnectionStatus {
  connected: boolean;
  connectionId?: string;
  connectedAt?: string;
  errorCount: number;
  lastError?: string;
}

export default function SSETestClient() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    errorCount: 0,
  });
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [customChannel, setCustomChannel] = useState<string>("");
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Predefined channels for testing
  const predefinedChannels = [
    { value: "", label: "General SSE" },
    { value: "notifications", label: "Notifications" },
    { value: "analytics", label: "Analytics" },
    { value: "system", label: "System Events" },
  ];

  const connectToSSE = (channel?: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = channel
      ? `/api/sse/${encodeURIComponent(channel)}`
      : "/api/sse";

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus((prev) => ({
        ...prev,
        connected: true,
        lastError: undefined,
      }));
    };

    eventSource.onmessage = (event) => {
      addMessage("message", event.data as string, event);
    };

    // EventSource setup complete

    eventSource.onerror = () => {
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        errorCount: prev.errorCount + 1,
        lastError: "Connection failed",
      }));

      if (autoReconnect && eventSource.readyState === EventSource.CLOSED) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToSSE(channel);
        }, 3000);
      }
    };

    // Listen for specific event types - make sure these match what server sends
    const eventTypes = [
      "connected",
      "ping",
      "notification",
      "system_notification", // This matches systemNotification() method
      "user_update",
      "system_message",
      "data_sync",
      "channel_joined",
      "analytics_update",
      "job_progress",
      "custom",
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event) => {
        try {
          addMessage(eventType, event.data as string, event);
        } catch {
          // Ignore parsing errors
        }
      });
    });

    // Handle connection confirmation
    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data as string) as {
        connectionId: string;
        timestamp: string;
      };
      setConnectionStatus((prev) => ({
        ...prev,
        connectionId: data.connectionId,
        connectedAt: data.timestamp,
      }));
    });
  };

  const addMessage = (
    eventType: string,
    data: string,
    _event: MessageEvent,
  ) => {
    try {
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      const message: SSEMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event: eventType,
        data: parsedData,
        raw: data,
      };

      setMessages((prev) => {
        const newMessages = [message, ...prev.slice(0, 99)]; // Keep last 100 messages
        return newMessages;
      });
    } catch {
      // Ignore message processing errors
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus({
      connected: false,
      errorCount: 0,
    });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const sendTestEvent = async (eventType: string) => {
    try {
      const requestBody = {
        type: eventType,
        target: "broadcast",
      };

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await response.text();
        throw new Error(
          `Failed to send test event: ${response.status} ${response.statusText}`,
        );
      }

      await response.json();
    } catch {
      // Ignore test event errors
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const activeChannel = customChannel || selectedChannel;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Connection Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Connection Controls
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Channel
              </label>
              <select
                value={selectedChannel}
                onChange={(e) => {
                  setSelectedChannel(e.target.value);
                  setCustomChannel("");
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={connectionStatus.connected}
              >
                {predefinedChannels.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Custom Channel
              </label>
              <input
                type="text"
                value={customChannel}
                onChange={(e) => {
                  setCustomChannel(e.target.value);
                  setSelectedChannel("");
                }}
                placeholder="Enter custom channel name"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={connectionStatus.connected}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoReconnect"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoReconnect" className="text-sm text-gray-700">
                Auto-reconnect on failure
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="min-w-[80px] font-semibold text-gray-900">
                  Status:
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    connectionStatus.connected
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {connectionStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {connectionStatus.connectionId && (
                <div className="flex items-start gap-3">
                  <span className="min-w-[100px] flex-shrink-0 font-semibold text-gray-900">
                    Connection ID:
                  </span>
                  <span className="rounded bg-gray-50 px-2 py-1 font-mono text-xs break-all">
                    {connectionStatus.connectionId}
                  </span>
                </div>
              )}

              {connectionStatus.connectedAt && (
                <div className="flex items-center gap-3">
                  <span className="min-w-[100px] font-semibold text-gray-900">
                    Connected At:
                  </span>
                  <span className="text-gray-700">
                    {new Date(connectionStatus.connectedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="min-w-[80px] font-semibold text-gray-900">
                  Error Count:
                </span>
                <span
                  className={
                    connectionStatus.errorCount > 0
                      ? "font-semibold text-red-600"
                      : "text-gray-600"
                  }
                >
                  {connectionStatus.errorCount}
                </span>
              </div>

              {connectionStatus.lastError && (
                <div className="flex items-start gap-3">
                  <span className="min-w-[80px] flex-shrink-0 font-semibold text-red-600">
                    Last Error:
                  </span>
                  <span className="text-red-600">
                    {connectionStatus.lastError}
                  </span>
                </div>
              )}
            </div>

            <div className="space-x-2">
              <Button
                onClick={() => connectToSSE(activeChannel)}
                disabled={connectionStatus.connected}
                variant="primary"
              >
                Connect
              </Button>
              <Button
                onClick={disconnect}
                disabled={!connectionStatus.connected}
                variant="secondary"
              >
                Disconnect
              </Button>
              <Button onClick={clearMessages} variant="outline">
                Clear Messages
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Event Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Send Test Events
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Button
            onClick={() => sendTestEvent("notification")}
            variant="outline"
            size="sm"
          >
            Test Notification
          </Button>
          <Button
            onClick={() => sendTestEvent("system_message")}
            variant="outline"
            size="sm"
          >
            System Message
          </Button>
          <Button
            onClick={() => sendTestEvent("data_sync")}
            variant="outline"
            size="sm"
          >
            Data Sync
          </Button>
          <Button
            onClick={() => sendTestEvent("user_update")}
            variant="outline"
            size="sm"
          >
            User Update
          </Button>
        </div>
      </div>

      {/* Messages Display */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Messages ({messages.length})
          </h2>
          {connectionStatus.connected && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="font-medium">Live</span>
            </div>
          )}
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-4">
          {messages.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-2 text-lg text-gray-400">📡</div>
              <p className="font-medium text-gray-600">
                No messages received yet
              </p>
              <p className="text-sm text-gray-500">
                Connect to start receiving events
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      message.event === "ping"
                        ? "bg-blue-100 text-blue-800"
                        : message.event === "notification"
                          ? "bg-green-100 text-green-800"
                          : message.event === "connected"
                            ? "bg-purple-100 text-purple-800"
                            : message.event === "error"
                              ? "bg-red-100 text-red-800"
                              : message.event === "system_message"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.event}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg bg-gray-900 p-3 font-mono text-xs">
                  <pre className="text-gray-100">
                    {JSON.stringify(message.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
