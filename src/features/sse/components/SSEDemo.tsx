"use client";

import { useState, useEffect } from "react";
import { useSSE } from "../hooks/useSSE";
import { api } from "@/trpc/react";
import type { SSEEventPayload } from "../types";

/**
 * Demo component showcasing SSE functionality
 */
export function SSEDemo() {
  const [latestMessage, setLatestMessage] = useState<{
    event: string;
    data: SSEEventPayload;
    timestamp: number;
  } | null>(null);
  const [messageHistory, setMessageHistory] = useState<
    Array<{
      event: string;
      data: SSEEventPayload;
      timestamp: number;
    }>
  >([]);

  // SSE hook
  const { status, clientId, userId, connect, disconnect, addEventListener } =
    useSSE({
      onMessage: (event, data) => {
        const message = {
          event,
          data,
          timestamp: Date.now(),
        };
        setLatestMessage(message);
        setMessageHistory((prev) => [message, ...prev.slice(0, 9)]); // Keep last 10 messages
      },
    });

  // tRPC mutations
  const sendTestNotification = api.sse.sendTestNotification.useMutation();
  const sendSystemNotification = api.sse.sendSystemNotification.useMutation();
  const broadcastNotification = api.sse.broadcastNotification.useMutation();
  const stats = api.sse.getStats.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Add event listeners
  useEffect(() => {
    const handleNotification = (event: string, data: SSEEventPayload) => {
      console.log(`Received ${event}:`, data);
    };

    addEventListener("notification", handleNotification);
    addEventListener("system", handleNotification);
    addEventListener("test", handleNotification);
    addEventListener("heartbeat", handleNotification);

    return () => {
      // Cleanup is handled by the hook
    };
  }, [addEventListener]);

  // Handle test notification
  const handleSendTestNotification = async () => {
    if (!clientId) return;

    await sendTestNotification.mutateAsync({
      clientId,
      message: `Test message at ${new Date().toLocaleTimeString()}`,
      event: "test",
    });
  };

  // Handle system notification
  const handleSendSystemNotification = async () => {
    await sendSystemNotification.mutateAsync({
      message: `System update at ${new Date().toLocaleTimeString()}`,
      type: "info",
    });
  };

  // Handle broadcast notification
  const handleBroadcastNotification = async () => {
    await broadcastNotification.mutateAsync({
      event: "broadcast",
      message: `Broadcast message at ${new Date().toLocaleTimeString()}`,
      data: {
        sender: "Demo Component",
        priority: "normal",
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-bold">SSE Demo</h2>

        {/* Connection Status */}
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Connection Status</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  status === "connected"
                    ? "bg-green-500"
                    : status === "connecting"
                      ? "bg-yellow-500"
                      : status === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                }`}
              />
              <span className="capitalize">{status}</span>
            </div>
            {clientId && (
              <span className="text-sm text-gray-600">
                Client ID: {clientId}
              </span>
            )}
            {userId && (
              <span className="text-sm text-gray-600">User ID: {userId}</span>
            )}
          </div>

          <div className="mt-2 space-x-2">
            <button
              onClick={connect}
              disabled={status === "connected" || status === "connecting"}
              className="rounded bg-blue-500 px-3 py-1 text-white disabled:opacity-50"
            >
              Connect
            </button>
            <button
              onClick={disconnect}
              disabled={status === "disconnected"}
              className="rounded bg-red-500 px-3 py-1 text-white disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats.data && (
          <div className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">
              Connection Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded bg-gray-50 p-3">
                <div className="text-sm text-gray-600">Total Connections</div>
                <div className="text-xl font-bold">
                  {stats.data.totalConnections}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-sm text-gray-600">Active Connections</div>
                <div className="text-xl font-bold">
                  {stats.data.activeConnections}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-sm text-gray-600">Events Sent</div>
                <div className="text-xl font-bold">
                  {stats.data.totalEventsSent}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-sm text-gray-600">Broadcasts</div>
                <div className="text-xl font-bold">
                  {stats.data.totalBroadcasts}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Test Actions</h3>
          <div className="space-x-2">
            <button
              onClick={handleSendTestNotification}
              disabled={status !== "connected" || !clientId}
              className="rounded bg-green-500 px-4 py-2 text-white disabled:opacity-50"
            >
              Send Test Notification
            </button>
            <button
              onClick={handleSendSystemNotification}
              disabled={status !== "connected"}
              className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
            >
              Send System Notification
            </button>
            <button
              onClick={handleBroadcastNotification}
              disabled={status !== "connected"}
              className="rounded bg-purple-500 px-4 py-2 text-white disabled:opacity-50"
            >
              Broadcast Message
            </button>
          </div>
        </div>

        {/* Latest Message */}
        {latestMessage && (
          <div className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">Latest Message</h3>
            <div className="rounded bg-gray-50 p-4">
              <div className="mb-2 flex items-start justify-between">
                <span className="font-medium text-blue-600">
                  {latestMessage.event}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(latestMessage.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="overflow-x-auto rounded border bg-white p-2 text-sm">
                {JSON.stringify(latestMessage.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Message History */}
        {messageHistory.length > 0 && (
          <div>
            <h3 className="mb-2 text-lg font-semibold">Message History</h3>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {messageHistory.map((message, index) => (
                <div key={index} className="rounded bg-gray-50 p-3">
                  <div className="mb-1 flex items-start justify-between">
                    <span className="text-sm font-medium">{message.event}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="truncate text-xs text-gray-600">
                    {JSON.stringify(message.data)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
