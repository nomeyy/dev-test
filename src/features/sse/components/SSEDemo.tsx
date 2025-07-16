"use client";

import { useState, useEffect, useCallback } from "react";
// Simple button component for demo
const Button = ({
  onClick,
  disabled = false,
  variant = "default",
  size = "sm",
  className = "",
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) => {
  const baseClass =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};
import type { SSEEvent } from "../types";

interface SSEMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  received: Date;
}

interface SSEDemoProps {
  userId?: string;
  className?: string;
}

export function SSEDemo({ userId, className = "" }: SSEDemoProps) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStats, setConnectionStats] = useState<{
    activeConnections: number;
    totalConnections: number;
    uptime: number;
  } | null>(null);

  const connect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
    }

    const clientId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = `/api/sse?clientId=${clientId}${userId ? `&userId=${userId}` : ""}`;

    // Note: EventSource automatically sends cookies, but session might still be null
    // due to timing or configuration issues
    const newEventSource = new EventSource(url);

    newEventSource.onopen = () => {
      setConnected(true);
      setError(null);
      console.log("SSE connection opened");
    };

    newEventSource.onerror = (event) => {
      setConnected(false);
      setError("Connection error occurred");
      console.error("SSE error:", event);
    };

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE message received:", data);
      } catch (e) {
        console.log("SSE raw message:", event.data);
      }
    };

    // Listen for specific events
    newEventSource.addEventListener("connected", (event) => {
      try {
        const data = JSON.parse(event.data);
        addMessage({
          id: event.lastEventId || `connected-${Date.now()}`,
          event: "connected",
          data,
          timestamp: data.timestamp || Date.now(),
          received: new Date(),
        });
      } catch (e) {
        console.error("Error parsing connected event:", e);
      }
    });

    newEventSource.addEventListener("ping", (event) => {
      try {
        const data = JSON.parse(event.data);
        // Don't add ping messages to the display, just log them
        console.log("Ping received:", data);
      } catch (e) {
        console.error("Error parsing ping event:", e);
      }
    });

    newEventSource.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse(event.data);
        addMessage({
          id: event.lastEventId || `notification-${Date.now()}`,
          event: "notification",
          data,
          timestamp: data.timestamp || Date.now(),
          received: new Date(),
        });
      } catch (e) {
        console.error("Error parsing notification event:", e);
      }
    });

    newEventSource.addEventListener("system", (event) => {
      try {
        const data = JSON.parse(event.data);
        addMessage({
          id: event.lastEventId || `system-${Date.now()}`,
          event: "system",
          data,
          timestamp: data.timestamp || Date.now(),
          received: new Date(),
        });
      } catch (e) {
        console.error("Error parsing system event:", e);
      }
    });

    // Listen for custom events
    const customEventTypes = ["alert", "update"];

    customEventTypes.forEach((eventType) => {
      newEventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          addMessage({
            id: event.lastEventId || `${eventType}-${Date.now()}`,
            event: eventType,
            data,
            timestamp: data.timestamp || Date.now(),
            received: new Date(),
          });
        } catch (e) {
          console.error(`Error parsing ${eventType} event:`, e);
        }
      });
    });

    setEventSource(newEventSource);
  }, [eventSource, userId]);

  const disconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setConnected(false);
      setError(null);
    }
  }, [eventSource]);

  const addMessage = useCallback((message: SSEMessage) => {
    setMessages((prev) => [message, ...prev.slice(0, 19)]); // Keep only last 20 messages
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!userId) {
      alert("User ID is required to send notifications");
      return;
    }

    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type: "notification",
          message: "Test notification from SSE demo!",
          data: { demo: true, timestamp: Date.now() },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      alert("Failed to send test notification");
    }
  }, [userId]);

  const sendTestAlert = useCallback(async () => {
    if (!userId) {
      alert("User ID is required to send alerts");
      return;
    }

    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type: "alert",
          message: "Test alert from SSE demo!",
          data: { demo: true, timestamp: Date.now() },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test alert");
      }
    } catch (error) {
      console.error("Error sending test alert:", error);
      alert("Failed to send test alert");
    }
  }, [userId]);

  const sendSystemMessage = useCallback(async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "system",
          message: "Test system message from SSE demo!",
          data: { demo: true, timestamp: Date.now() },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send system message");
      }
    } catch (error) {
      console.error("Error sending system message:", error);
      alert("Failed to send system message");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "notification":
        return "bg-blue-100 text-blue-800";
      case "alert":
        return "bg-red-100 text-red-800";
      case "system":
        return "bg-purple-100 text-purple-800";
      case "update":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatReceived = (received: Date) => {
    return received.toLocaleTimeString();
  };

  return (
    <div className={`mx-auto max-w-2xl space-y-6 p-6 ${className}`}>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">SSE Demo</h2>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${
                connected
                  ? "bg-green-500"
                  : error
                    ? "bg-red-500"
                    : "bg-gray-300"
              }`}
            />
            <span className="text-sm font-medium">
              {connected ? "Connected" : error ? "Error" : "Disconnected"}
            </span>
          </div>
          {userId && (
            <span className="text-sm text-gray-600">User ID: {userId}</span>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            onClick={connect}
            disabled={connected}
            variant="default"
            size="sm"
          >
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!connected}
            variant="outline"
            size="sm"
          >
            Disconnect
          </Button>
          <Button onClick={clearMessages} variant="outline" size="sm">
            Clear Messages
          </Button>
          {userId && (
            <>
              <Button
                onClick={sendTestNotification}
                disabled={!connected}
                variant="default"
                size="sm"
              >
                Send Test Notification
              </Button>
              <Button
                onClick={sendTestAlert}
                disabled={!connected}
                variant="destructive"
                size="sm"
              >
                Send Test Alert
              </Button>
            </>
          )}
          <Button
            onClick={sendSystemMessage}
            disabled={!connected}
            variant="secondary"
            size="sm"
          >
            Send System Message
          </Button>
        </div>

        {/* Messages */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Messages ({messages.length})
          </h3>
          <div className="max-h-96 overflow-y-auto rounded border">
            {messages.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No messages received yet. Connect to start receiving events.
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="border-b p-3 last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${getEventBadgeColor(
                          message.event,
                        )}`}
                      >
                        {message.event}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatReceived(message.received)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800">
                      {message.data.message ||
                        JSON.stringify(message.data, null, 2)}
                    </div>
                    {message.data.timestamp && (
                      <div className="mt-1 text-xs text-gray-500">
                        Server time: {formatTimestamp(message.data.timestamp)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
