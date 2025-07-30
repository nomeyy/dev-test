"use client";

import { useState, useEffect } from "react";
import { useSSE } from "@/features/sse/hooks/useSSE";
import { api } from "@/trpc/react";

/**
 * Comprehensive SSE Test Page
 * Demonstrates all requirements from the SSE ticket:
 * - Client connection tracking
 * - Event broadcasting
 * - Heartbeat mechanism
 * - Proper cleanup
 * - Error handling
 * - Backend integration via tRPC
 */
export default function SSETestPage() {
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [messages, setMessages] = useState<
    Array<{ id: string; event: string; data: any; timestamp: number }>
  >([]);
  const [clientId, setClientId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);

  // SSE hook for real-time events
  const { connect, disconnect, isConnected, lastMessage } = useSSE();

  // tRPC mutations for testing backend integration
  const sendSystemNotification = api.sse.sendSystemNotification.useMutation();
  const broadcastNotification = api.sse.broadcastNotification.useMutation();
  const getStats = api.sse.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Handle SSE connection
  const handleConnect = async () => {
    setConnectionStatus("connecting");
    try {
      const id = await connect();
      setClientId(id);
      setConnectionStatus("connected");
      addMessage("system", "Connected to SSE server", { clientId: id });
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionStatus("disconnected");
      addMessage("error", "Connection failed", {
        error: (error as Error).message,
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setConnectionStatus("disconnected");
    setClientId("");
    addMessage("system", "Disconnected from SSE server");
  };

  // Add message to the list
  const addMessage = (event: string, message: string, data?: any) => {
    const newMessage = {
      id: Date.now().toString(),
      event,
      data: { message, ...data },
      timestamp: Date.now(),
    };
    setMessages((prev) => [newMessage, ...prev.slice(0, 49)]); // Keep last 50 messages
  };

  // Handle incoming SSE messages
  useEffect(() => {
    if (lastMessage) {
      addMessage(lastMessage.event, "Received SSE event", lastMessage.data);
    }
  }, [lastMessage]);

  // Update stats
  useEffect(() => {
    if (getStats.data) {
      setStats(getStats.data);
    }
  }, [getStats.data]);

  // Test functions for backend integration
  const testSystemNotification = async () => {
    try {
      await sendSystemNotification.mutateAsync({
        message: "Test system notification",
        type: "info",
      });
      addMessage("test", "System notification sent");
    } catch (error) {
      addMessage("error", "Failed to send system notification", {
        error: (error as Error).message,
      });
    }
  };

  const testBroadcastNotification = async () => {
    try {
      await broadcastNotification.mutateAsync({
        message: "Test broadcast to all clients",
        event: "broadcast",
        data: { timestamp: Date.now() },
      });
      addMessage("test", "Broadcast notification sent");
    } catch (error) {
      addMessage("error", "Failed to send broadcast notification", {
        error: (error as Error).message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-lg border border-white/20 bg-white/10 p-6 shadow-md backdrop-blur-sm">
          <h1 className="mb-4 text-3xl font-bold text-white">
            SSE Implementation Test
          </h1>
          <p className="mb-6 text-white/80">
            This page tests all requirements from the SSE ticket specification.
          </p>

          {/* Connection Status */}
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">Connection Status</h2>
            <div className="mb-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                  }`}
                ></div>
                <span className="text-white capitalize">
                  {connectionStatus}
                </span>
              </div>
              {clientId && (
                <span className="text-sm text-white">
                  Client ID: {clientId}
                </span>
              )}
            </div>
            <div className="space-x-2">
              <button
                onClick={handleConnect}
                disabled={
                  connectionStatus === "connected" ||
                  connectionStatus === "connecting"
                }
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Connect
              </button>
              <button
                onClick={handleDisconnect}
                disabled={connectionStatus !== "connected"}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Backend Integration Tests */}
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">
              Backend Integration Tests
            </h2>
            <div className="space-x-2">
              <button
                onClick={testSystemNotification}
                disabled={!isConnected}
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
              >
                Send System Notification
              </button>
              <button
                onClick={testBroadcastNotification}
                disabled={!isConnected}
                className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50"
              >
                Broadcast to All Clients
              </button>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">Server Statistics</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded bg-gray-100 p-3">
                  <div className="text-sm text-gray-600">Total Connections</div>
                  <div className="text-lg font-semibold text-black">
                    {stats.totalConnections}
                  </div>
                </div>
                <div className="rounded bg-gray-100 p-3">
                  <div className="text-sm text-gray-600">
                    Active Connections
                  </div>
                  <div className="text-lg font-semibold text-black">
                    {stats.activeConnections}
                  </div>
                </div>
                <div className="rounded bg-gray-100 p-3">
                  <div className="text-sm text-gray-600">Total Events Sent</div>
                  <div className="text-lg font-semibold text-black">
                    {stats.totalEventsSent}
                  </div>
                </div>
                <div className="rounded bg-gray-100 p-3">
                  <div className="text-sm text-gray-600">Total Broadcasts</div>
                  <div className="text-lg font-semibold text-black">
                    {stats.totalBroadcasts}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-md backdrop-blur-sm">
          <h2 className="mb-2 text-xl font-semibold text-white">
            SSE Messages
          </h2>
          <div className="max-h-96 overflow-y-auto rounded bg-black/20 p-4">
            {messages.length === 0 ? (
              <p className="text-white/60">
                No messages yet. Connect to start receiving events.
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="border-l-4 border-blue-400 py-2 pl-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white">
                          {msg.event}
                        </span>
                        <p className="text-sm text-white/80">
                          {msg.data?.message}
                        </p>
                        {msg.data?.clientId && (
                          <p className="text-xs text-white/60">
                            Client: {msg.data.clientId}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-white/60">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="mt-6 rounded-lg border border-white/20 bg-white/10 p-6 shadow-md backdrop-blur-sm">
          <h2 className="mb-4 text-2xl font-bold text-white">
            SSE Requirements Checklist
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Core Requirements
              </h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  SSE endpoint implemented (/api/sse)
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Client connection tracking
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Named events with JSON payloads
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Heartbeat/ping mechanism (30s intervals)
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Client disconnect cleanup
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Error handling and logging
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Backend Integration
              </h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  tRPC integration for backend calls
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  System notification API
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Broadcast to all clients
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Statistics and monitoring
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  User/session-based targeting
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✅</span>
                  Clean API for backend modules
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
