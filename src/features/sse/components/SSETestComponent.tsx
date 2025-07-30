"use client";

import { useState, useCallback, useEffect } from "react";
import { useSSE } from "../hooks/useSSE";
import { SSE_EVENT_TYPES } from "@/types/sse";
import type { SSEEvent } from "@/types/sse";

/**
 * Test component for SSE functionality
 * Provides a simple UI to test real-time event reception
 */
export function SSETestComponent() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<string>("all");

  const sse = useSSE({
    autoConnect: true,
    autoReconnect: true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 5,
  });

  // Add event listeners
  const handleEvent = useCallback((event: SSEEvent) => {
    setEvents((prev) => [event, ...prev.slice(0, 49)]); // Keep last 50 events
  }, []);

  // Listen to all event types
  const addAllListeners = useCallback(() => {
    const listeners: (() => void)[] = [];

    Object.values(SSE_EVENT_TYPES).forEach((eventType) => {
      const removeListener = sse.addEventListener(eventType, handleEvent);
      listeners.push(removeListener);
    });

    return () => {
      listeners.forEach((remove) => remove());
    };
  }, [sse, handleEvent]);

  // Set up event listeners when component mounts or SSE changes
  useEffect(() => {
    const cleanupListeners = addAllListeners();
    return cleanupListeners;
  }, [addAllListeners]);

  // Filter events based on selected filter
  const filteredEvents = events.filter((event) => {
    if (eventFilter === "all") return true;
    return event.type === eventFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case SSE_EVENT_TYPES.HEARTBEAT:
        return "bg-gray-100 text-gray-800";
      case SSE_EVENT_TYPES.NOTIFICATION:
        return "bg-blue-100 text-blue-800";
      case SSE_EVENT_TYPES.VIDEO_UPLOAD_PROGRESS:
        return "bg-purple-100 text-purple-800";
      case SSE_EVENT_TYPES.VIDEO_READY:
        return "bg-green-100 text-green-800";
      case SSE_EVENT_TYPES.USER_UPDATE:
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-indigo-100 text-indigo-800";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          SSE Test Dashboard
        </h2>

        {/* Connection Status */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  sse.status === "connected"
                    ? "bg-green-500"
                    : sse.status === "connecting"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <span className={`font-medium ${getStatusColor(sse.status)}`}>
                {sse.status.toUpperCase()}
              </span>
            </div>

            {sse.reconnectAttempts > 0 && (
              <span className="text-sm text-gray-600">
                Reconnect attempts: {sse.reconnectAttempts}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={sse.connect}
              disabled={
                sse.status === "connected" || sse.status === "connecting"
              }
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Connect
            </button>
            <button
              onClick={sse.disconnect}
              disabled={sse.status === "disconnected"}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Disconnect
            </button>
            <button
              onClick={() => setEvents([])}
              className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Clear Events
            </button>
          </div>

          {sse.error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">Error: {sse.error}</p>
            </div>
          )}
        </div>

        {/* Event Filter */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Event Filter
          </label>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Events</option>
            {Object.values(SSE_EVENT_TYPES).map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
        </div>

        {/* Test Buttons for Manual Events */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Manual Test Events
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                // Simulate sending a test notification
                // In real usage, this would be triggered from backend
                fetch("/api/test-sse", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "notification",
                    message: "Test notification",
                  }),
                }).catch(console.error);
              }}
              className="rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200"
            >
              Send Test Notification
            </button>
          </div>
        </div>

        {/* Events List */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Events ({filteredEvents.length})
            </h3>
            <span className="text-sm text-gray-600">
              Showing last 50 events
            </span>
          </div>

          <div className="max-h-96 space-y-3 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No events received yet. Connect to start receiving events.
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <div
                  key={`${event.id ?? index}-${index}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(event.type)}`}
                    >
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {event.id && `ID: ${event.id}`}
                    </span>
                  </div>

                  <div className="rounded border bg-white p-3">
                    <pre className="overflow-x-auto text-sm whitespace-pre-wrap text-gray-800">
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
  );
}
