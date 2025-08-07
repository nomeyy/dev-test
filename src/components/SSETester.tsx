"use client";

import { useEffect, useState } from "react";

interface SSEMessage {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp: number;
  id: string;
}

function parseSSEMessage(data: string): SSEMessage {
  const parsed = JSON.parse(data) as SSEMessage;
  return parsed;
}

function parseConnectionData(data: string): {
  id: string;
  timestamp: number;
  message: string;
} {
  const parsed = JSON.parse(data) as {
    id: string;
    timestamp: number;
    message: string;
  };
  return parsed;
}

function parsePingData(data: string): { timestamp: number } {
  const parsed = JSON.parse(data) as { timestamp: number };
  return parsed;
}

export default function SSETester() {
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [clientId, setClientId] = useState<string>("");
  const [messageHistory, setMessageHistory] = useState<SSEMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    const id = crypto.randomUUID();
    setClientId(id);
    setConnectionStatus("connecting");

    const eventSource = new EventSource(`/api/sse?id=${id}`);

    eventSource.addEventListener("connected", (event) => {
      const data = parseConnectionData(event.data as string);
      console.log(`✅ Connected to SSE with ID: ${data.id}`);
      setConnectionStatus("connected");
      setLatestMessage(`✅ Connected with ID: ${data.id}`);
    });

    eventSource.addEventListener("notification", (event) => {
      const notification = parseSSEMessage(event.data as string);
      console.log("📩 Received notification:", notification);

      setLatestMessage(notification.message);
      setMessageHistory((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10 messages
    });

    eventSource.addEventListener("ping", (event) => {
      const pingData = parsePingData(event.data as string);
      console.log("💓 Heartbeat received:", pingData);
    });

    eventSource.onerror = (error) => {
      console.error("❌ SSE connection error:", error);
      setConnectionStatus("disconnected");
      setLatestMessage("❌ Connection error - attempting to reconnect...");
    };

    eventSource.onopen = () => {
      console.log("🔌 SSE connection opened");
      setConnectionStatus("connected");
    };

    return () => {
      console.log("🔌 Closing SSE connection");
      eventSource.close();
      setConnectionStatus("disconnected");
    };
  }, []);

  const sendTestEvent = async () => {
    if (isSending) return;

    setIsSending(true);
    setNotificationSent(false);
    try {
      const response = await fetch("/api/test-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `🧪 Test notification sent at ${new Date().toLocaleTimeString()}`,
          type: "info",
        }),
      });

      const result = (await response.json()) as {
        status: string;
        message: string;
        clientsNotified: number;
      };
      console.log("📤 Test notification sent:", result);

      // Show visual confirmation
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 3000); // Hide after 3 seconds
    } catch (error) {
      console.error("❌ Failed to send test notification:", error);
      setLatestMessage("❌ Failed to send test notification");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600 dark:text-green-400";
      case "connecting":
        return "text-yellow-600 dark:text-yellow-400";
      case "disconnected":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusEmoji = () => {
    switch (connectionStatus) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "disconnected":
        return "🔴";
      default:
        return "⚪";
    }
  };

  return (
    <div className="bg-card max-w-2xl rounded-lg border p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-card-foreground mb-2 text-lg font-semibold">
          SSE Real-time Notifications Test
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusEmoji()} Status: {connectionStatus}
          </span>
          {clientId && (
            <span className="text-muted-foreground">
              | Client ID: {clientId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="text-card-foreground mb-2 block text-sm font-medium">
          Latest Message:
        </label>
        <div className="min-h-[60px] rounded-md border bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          {latestMessage}
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={sendTestEvent}
          disabled={connectionStatus !== "connected" || isSending}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            connectionStatus === "connected" && !isSending
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          } `}
        >
          {isSending ? "⏳ Sending..." : "📤 Send Test Notification"}
        </button>

        {/* Visual confirmation message */}
        {notificationSent && (
          <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-100">
            ✅ Notification sent successfully!
          </div>
        )}
      </div>

      {messageHistory.length > 0 && (
        <div className="mt-4">
          <label className="text-card-foreground mb-2 block text-sm font-medium">
            Message History ({messageHistory.length}):
          </label>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            {messageHistory.map((msg) => (
              <div
                key={msg.id}
                className="rounded border bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {msg.message}
                  </span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {msg.type && (
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                      msg.type === "success"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : msg.type === "warning"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          : msg.type === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                    } `}
                  >
                    {msg.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
