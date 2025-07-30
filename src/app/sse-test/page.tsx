"use client";

import { useState, useEffect } from "react";
import { useSSE } from "@/features/sse";
import type { SSEEvent } from "@/features/sse";

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  userConnections: number;
  sessionConnections: number;
  averageConnectionAge: number;
}

export default function SSETestPage() {
  const [lastMessage, setLastMessage] = useState<string>("No messages yet");
  const [connectionStats, setConnectionStats] =
    useState<ConnectionStats | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  const {
    isConnected,
    isConnecting,
    lastEvent,
    error,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
  } = useSSE(
    "test-session",
    { reconnect: true, reconnectInterval: 3000 },
    () => console.log("SSE Connected!"),
    () => console.log("SSE Disconnected!"),
    (error) => console.error("SSE Error:", error),
  );

  // Handle different event types
  useEffect(() => {
    const handleSystemEvent = (event: SSEEvent) => {
      const message = event.data.message as string;
      const severity = event.data.severity as string;
      setLastMessage(`System: ${message} (${severity})`);
      setMessageCount((prev) => prev + 1);
    };

    const handleNotificationEvent = (event: SSEEvent) => {
      setLastMessage(`Notification: ${JSON.stringify(event.data)}`);
      setMessageCount((prev) => prev + 1);
    };

    const handleHeartbeatEvent = (event: SSEEvent) => {
      const timestamp = event.data.timestamp as number;
      setLastMessage(`Heartbeat: ${new Date(timestamp).toLocaleTimeString()}`);
    };

    const handleConnectionEvent = (event: SSEEvent) => {
      const status = event.data.status as string;
      const connectionId = event.data.connectionId as string;
      setLastMessage(`Connection: ${status} (ID: ${connectionId})`);
      setMessageCount((prev) => prev + 1);
    };

    addEventListener("system", handleSystemEvent);
    addEventListener("notification", handleNotificationEvent);
    addEventListener("heartbeat", handleHeartbeatEvent);
    addEventListener("connection", handleConnectionEvent);

    return () => {
      removeEventListener("system", handleSystemEvent);
      removeEventListener("notification", handleNotificationEvent);
      removeEventListener("heartbeat", handleHeartbeatEvent);
      removeEventListener("connection", handleConnectionEvent);
    };
  }, [addEventListener, removeEventListener]);

  // Update stats periodically
  useEffect(() => {
    const updateStats = async () => {
      try {
        const response = await fetch("/api/sse/stats");
        const result = (await response.json()) as {
          success: boolean;
          data: ConnectionStats;
        };
        if (result.success) {
          setConnectionStats(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    const interval = setInterval(() => {
      void updateStats();
    }, 5000);
    void updateStats(); // Initial fetch

    return () => clearInterval(interval);
  }, []);

  const sendTestNotification = async () => {
    try {
      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          eventType: "notification",
          data: {
            message: `Test notification sent at ${new Date().toLocaleTimeString()}`,
            sender: "Test UI",
            random: Math.floor(Math.random() * 1000),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };
      console.log("Notification sent:", result);
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const sendSystemAlert = async () => {
    try {
      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          message: `System alert: ${new Date().toLocaleTimeString()}`,
          severity: "warning",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };
      console.log("System alert sent:", result);
    } catch (error) {
      console.error("Failed to send system alert:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto max-w-5xl px-3 py-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="mb-1 text-2xl font-bold text-white">
            Server-Sent <span className="text-[hsl(280,100%,70%)]">Events</span>
          </h1>
          <p className="text-sm text-white/70">
            Real-time connection testing dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Left Column */}
          <div className="space-y-4 lg:col-span-3">
            {/* Connection Status */}
            <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Connection Status
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      isConnected
                        ? "bg-emerald-400 shadow-md shadow-emerald-400/50"
                        : isConnecting
                          ? "animate-pulse bg-amber-400 shadow-md shadow-amber-400/50"
                          : "bg-white/40"
                    }`}
                  ></div>
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isConnected
                        ? "text-emerald-400"
                        : isConnecting
                          ? "text-amber-400"
                          : "text-white/70"
                    }`}
                  >
                    {isConnected
                      ? "Connected"
                      : isConnecting
                        ? "Connecting..."
                        : "Disconnected"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={connect}
                  disabled={isConnected || isConnecting}
                  className="transform rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-white/30 focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Connect
                </button>
                <button
                  onClick={disconnect}
                  disabled={!isConnected}
                  className="transform rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-all duration-200 hover:scale-105 hover:bg-white/20 focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>

              {error && (
                <div className="mt-3 rounded-md border border-red-400/30 bg-red-500/20 p-3 text-red-300">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400"></div>
                    <span className="text-sm">
                      <strong>Error:</strong> {error.message}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Latest Message & Test Controls - Combined */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Latest Message */}
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Latest Message
                  </h2>
                  <div className="rounded-full bg-white/20 px-2 py-1 text-xs text-white/80">
                    {messageCount}
                  </div>
                </div>
                <div className="rounded-md border border-white/20 bg-white/10 p-3">
                  <p className="font-mono text-xs leading-relaxed break-all text-white/90">
                    {lastMessage}
                  </p>
                </div>
              </div>

              {/* Test Controls */}
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
                <h2 className="mb-3 text-lg font-semibold text-white">
                  Test Controls
                </h2>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={sendTestNotification}
                    className="transform rounded-md bg-emerald-500/80 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-500/25 transition-all duration-200 hover:scale-105 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-1 focus:outline-none active:scale-95"
                  >
                    Send Test Notification
                  </button>
                  <button
                    onClick={sendSystemAlert}
                    className="transform rounded-md bg-amber-500/80 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition-all duration-200 hover:scale-105 hover:bg-amber-500 focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-1 focus:outline-none active:scale-95"
                  >
                    Send System Alert
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Connection Statistics */}
            {connectionStats && (
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Live Stats
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md bg-white/10 p-2">
                    <span className="text-xs font-medium text-white/70">
                      Total
                    </span>
                    <span className="text-lg font-bold text-white">
                      {connectionStats.totalConnections}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-emerald-500/20 p-2">
                    <span className="text-xs font-medium text-emerald-300">
                      Active
                    </span>
                    <span className="text-lg font-bold text-emerald-400">
                      {connectionStats.activeConnections}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-blue-500/20 p-2">
                    <span className="text-xs font-medium text-blue-300">
                      Users
                    </span>
                    <span className="text-lg font-bold text-blue-400">
                      {connectionStats.userConnections}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-purple-500/20 p-2">
                    <span className="text-xs font-medium text-purple-300">
                      Sessions
                    </span>
                    <span className="text-lg font-bold text-purple-400">
                      {connectionStats.sessionConnections}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Event Log */}
            <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
              <h2 className="mb-3 text-lg font-semibold text-white">
                Event Details
              </h2>
              {lastEvent ? (
                <div className="max-h-48 overflow-auto rounded-md border border-white/20 bg-white/10 p-3">
                  <pre className="text-xs leading-tight whitespace-pre-wrap text-white/90">
                    {JSON.stringify(lastEvent, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-4 text-center text-white/50">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <div className="h-4 w-4 rounded-full border-2 border-dashed border-white/40"></div>
                  </div>
                  <p className="text-xs">No events yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
