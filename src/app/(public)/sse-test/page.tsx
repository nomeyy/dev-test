"use client";

import React, { useState, useEffect, useRef } from "react";

interface SSEEvent {
  type: string;
  data: any;
  timestamp?: string;
  id?: string;
}

interface SSEStats {
  totalClients: number;
  totalUsers: number;
  totalSessions: number;
  uptime: number;
  heartbeatEnabled: boolean;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  totalHeartbeatsSent: number;
  totalHeartbeatsReceived: number;
  lastHeartbeat?: Date;
  activeHeartbeats: number;
}

export default function SSETestPage() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [userId, setUserId] = useState("user_123");
  const [sessionId, setSessionId] = useState("session_456");

  // Events and stats
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [stats, setStats] = useState<SSEStats | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  // Send message form
  const [sendTarget, setSendTarget] = useState<
    "client" | "user" | "session" | "broadcast"
  >("user");
  const [sendTargetId, setSendTargetId] = useState("user_123");
  const [sendMessage, setSendMessage] = useState("Hello from SSE test!");

  // Connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const maxEvents = 50; // Limit displayed events

  // Connect to SSE
  const connect = () => {
    if (isConnected) return;

    const params = new URLSearchParams();
    if (userId.trim()) params.set("userId", userId.trim());
    if (sessionId.trim()) params.set("sessionId", sessionId.trim());

    const url = `/api/sse?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      addEvent({
        type: "connection",
        data: { message: "Connected to SSE stream" },
        timestamp: new Date().toISOString(),
      });
    };

    eventSource.onmessage = (event) => {
      try {
        const sseEvent: SSEEvent = JSON.parse(event.data);
        addEvent(sseEvent);
        setLastEvent(sseEvent);

        // Extract client ID from connection event
        if (sseEvent.type === "system:connected" && sseEvent.data.clientId) {
          setClientId(sseEvent.data.clientId);
        }

        // Update stats if available
        if (sseEvent.data.stats) {
          setStats(sseEvent.data.stats);
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
        addEvent({
          type: "error",
          data: { message: "Failed to parse event", error: event.data },
          timestamp: new Date().toISOString(),
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      addEvent({
        type: "error",
        data: { message: "Connection error occurred" },
        timestamp: new Date().toISOString(),
      });
      disconnect();
    };
  };

  // Disconnect from SSE
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setClientId("");
    addEvent({
      type: "connection",
      data: { message: "Disconnected from SSE stream" },
      timestamp: new Date().toISOString(),
    });
  };

  // Add event to list
  const addEvent = (event: SSEEvent) => {
    setEvents((prev) => {
      const newEvents = [event, ...prev];
      return newEvents.slice(0, maxEvents);
    });
  };

  // Send test message
  const sendTestMessage = async () => {
    if (!sendMessage.trim()) return;

    try {
      const payload = {
        target: sendTarget,
        targetId: sendTarget === "broadcast" ? undefined : sendTargetId,
        event: {
          type: "test_message",
          data: {
            message: sendMessage,
            sentBy: "SSE Test UI",
            timestamp: new Date().toISOString(),
          },
        },
      };

      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        addEvent({
          type: "send_result",
          data: {
            message: `Message sent successfully! Delivered to ${result.sentCount} client(s)`,
            result,
          },
          timestamp: new Date().toISOString(),
        });
        setSendMessage("");
      } else {
        addEvent({
          type: "send_error",
          data: {
            message: `Send failed: ${result.error}`,
            result,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addEvent({
        type: "send_error",
        data: {
          message: "Network error while sending message",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Clear events
  const clearEvents = () => {
    setEvents([]);
    setLastEvent(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Format timestamp
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get event color based on type
  const getEventColor = (type: string) => {
    switch (type) {
      case "system:connected":
      case "connection":
        return "text-green-600 bg-green-50";
      case "system:heartbeat":
        return "text-blue-600 bg-blue-50";
      case "error":
      case "send_error":
        return "text-red-600 bg-red-50";
      case "test_message":
        return "text-purple-600 bg-purple-50";
      case "send_result":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-900 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white/10 p-8 text-white shadow-2xl backdrop-blur-lg">
          <h1 className="mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-center text-4xl font-bold text-transparent">
            SSE Test Dashboard
          </h1>

          {/* Connection Status and Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="rounded-xl bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
                  ></div>
                  <span className="font-medium">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                {clientId && (
                  <div className="text-sm text-gray-300">
                    Client ID:{" "}
                    <code className="rounded bg-white/10 px-2 py-1 text-xs">
                      {clientId}
                    </code>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-semibold">Latest Event</h2>
              {lastEvent ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-blue-300">
                    {lastEvent.type}
                  </div>
                  <div className="truncate text-xs text-gray-300">
                    {JSON.stringify(lastEvent.data).substring(0, 40)}...
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTime(lastEvent.timestamp)}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No events yet</div>
              )}
            </div>

            <div className="rounded-xl bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-semibold">Server Stats</h2>
              {stats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Active Connections:</span>
                    <span className="font-medium text-blue-300">
                      {stats.totalClients}
                    </span>
                  </div>
                  <div className="mb-2 text-xs text-gray-400">
                    (Each browser tab = 1 connection)
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unique Users:</span>
                    <span className="font-medium text-green-300">
                      {stats.totalUsers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sessions:</span>
                    <span className="font-medium text-purple-300">
                      {stats.totalSessions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Server Uptime:</span>
                    <span className="font-medium text-gray-300">
                      {Math.round(stats.uptime / 1000)}s
                    </span>
                  </div>
                  {stats.totalClients > 1 && (
                    <div className="mt-2 rounded bg-yellow-400/10 p-2 text-xs text-yellow-400">
                      💡 Multiple connections detected. Close other browser tabs
                      to reduce count.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">No stats available</div>
              )}
            </div>

            <div className="rounded-xl bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-semibold">Heartbeat Status</h2>
              {stats ? (
                <div className="space-y-2 text-sm">
                  <div>
                    Enabled:{" "}
                    <span
                      className={`font-medium ${stats.heartbeatEnabled ? "text-green-400" : "text-red-400"}`}
                    >
                      {stats.heartbeatEnabled ? "Yes" : "No"}
                    </span>
                  </div>
                  {stats.heartbeatEnabled ? (
                    <>
                      <div>
                        Interval:{" "}
                        <span className="font-medium text-blue-300">
                          {stats.heartbeatInterval
                            ? `${stats.heartbeatInterval}ms`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        Timeout:{" "}
                        <span className="font-medium text-blue-300">
                          {stats.heartbeatTimeout
                            ? `${stats.heartbeatTimeout}ms`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        Received pings:{" "}
                        <span className="font-medium text-green-300">
                          {stats.totalHeartbeatsReceived || 0}
                        </span>
                      </div>
                      <div>
                        Status Updates:{" "}
                        <span className="font-medium text-purple-300">
                          {stats.totalHeartbeatsSent || 0}
                        </span>
                      </div>
                      <div>
                        Last heartbeat:{" "}
                        <span className="font-medium text-gray-300">
                          {stats.lastHeartbeat
                            ? formatTime(stats.lastHeartbeat.toString())
                            : "Never"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">
                      Heartbeat is disabled
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">Loading heartbeat data...</div>
              )}
            </div>
          </div>

          {/* Connection Controls */}
          <div className="mb-8 rounded-xl bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Connection Controls</h2>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  User ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isConnected}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 disabled:opacity-50"
                  placeholder="e.g., user_123"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  disabled={isConnected}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 disabled:opacity-50"
                  placeholder="e.g., session_456"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={connect}
                  disabled={isConnected}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50"
                >
                  Connect
                </button>
                <button
                  onClick={disconnect}
                  disabled={!isConnected}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          {/* Send Message */}
          <div className="mb-8 rounded-xl bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Send Test Message</h2>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Target</label>
                <select
                  value={sendTarget}
                  onChange={(e) => setSendTarget(e.target.value as any)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                >
                  <option value="user">To User</option>
                  <option value="session">To Session</option>
                  <option value="client">To Client</option>
                  <option value="broadcast">Broadcast All</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Target ID
                </label>
                <input
                  type="text"
                  value={sendTargetId}
                  onChange={(e) => setSendTargetId(e.target.value)}
                  disabled={sendTarget === "broadcast"}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 disabled:opacity-50"
                  placeholder={
                    sendTarget === "client"
                      ? "Client ID"
                      : sendTarget === "user"
                        ? "User ID"
                        : "Session ID"
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Message
                </label>
                <input
                  type="text"
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                  placeholder="Enter your message"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={sendTestMessage}
                  disabled={!sendMessage.trim()}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>

          {/* Events Log */}
          <div className="rounded-xl bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Events Log ({events.length})
              </h2>
              <button
                onClick={clearEvents}
                className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {events.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  No events yet. Connect to SSE to start receiving events.
                </div>
              ) : (
                events.map((event, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 ${getEventColor(event.type)}`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-sm font-medium">{event.type}</span>
                      <span className="text-xs opacity-70">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm opacity-90">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
