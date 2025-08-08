"use client";

import { useState, useEffect, useCallback } from "react";
import { useSSEConnection } from "@/hooks/useSSEConnection";
import {
  ConnectionStatus,
  EventLog,
  MetricsPanel,
  EventSender,
  HealthMonitor,
} from "@/features/sse";

export default function SSEDashboard() {
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [autoConnect, setAutoConnect] = useState(false);

  const {
    connected,
    connecting,
    error,
    events,
    metrics,
    health,
    connect,
    disconnect,
    sendEvent,
    clearEvents,
  } = useSSEConnection();

  // Auto-generate session ID on mount
  useEffect(() => {
    setSessionId(`session-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  const handleConnect = useCallback(() => {
    connect({
      userId: userId || undefined,
      sessionId: sessionId || undefined,
    });
  }, [connect, userId, sessionId]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            SSE Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time Server-Sent Events monitoring and testing
          </p>
        </div>

        {/* Connection Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Connection Settings
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                User ID (optional)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., user-1"
                className="relative z-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                disabled={connected || connecting}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Session ID
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="e.g., session-abc"
                className="relative z-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                disabled={connected || connecting}
              />
            </div>

            <div className="flex items-end">
              {!connected ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {connecting ? "Connecting..." : "Connect"}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="w-full rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoConnect"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label
              htmlFor="autoConnect"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Auto-reconnect on connection loss
            </label>
          </div>
        </div>

        {/* Status Bar */}
        <ConnectionStatus
          connected={connected}
          connecting={connecting}
          error={error}
          health={health}
        />

        {/* Main Grid */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Metrics Panel */}
          <MetricsPanel metrics={metrics} />

          {/* Health Monitor */}
          <HealthMonitor health={health} connected={connected} />
        </div>

        {/* Event Sender */}
        <EventSender
          connected={connected}
          onSendEvent={sendEvent}
          userId={userId}
          sessionId={sessionId}
        />

        {/* Event Log */}
        <EventLog events={events} onClear={clearEvents} />
      </div>
    </div>
  );
}
