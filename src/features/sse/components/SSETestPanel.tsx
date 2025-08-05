/**
 * SSE Test Panel Component
 * -----------------------
 * Mock UI component for testing SSE functionality
 */

"use client";

import { useState } from "react";
import { useSSE, useSSENotifications, useSSEMessages } from "../hooks/useSSE";
import { SSEStatusIndicator } from "./SSEStatusIndicator";

export function SSETestPanel() {
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState("Hello from SSE!");

  // Main SSE connection
  const sse = useSSE({
    autoConnect: true,
  });

  // Specialized hooks for different event types
  const { notifications, clearNotifications } = useSSENotifications();
  const { messages, clearMessages } = useSSEMessages();

  // Listen to all events for logging
  sse.addEventListener("ping", (event) => {
    setEventLog((prev) =>
      [`[PING] ${new Date().toLocaleTimeString()}`, ...prev].slice(0, 50),
    );
  });

  sse.addEventListener("connected", (event) => {
    setEventLog((prev) =>
      [`[CONNECTED] ${JSON.stringify(event.data)}`, ...prev].slice(0, 50),
    );
  });

  sse.addEventListener("custom", (event) => {
    setEventLog((prev) =>
      [`[CUSTOM] ${JSON.stringify(event.data)}`, ...prev].slice(0, 50),
    );
  });

  // Test functions (these would typically be server-side API calls)
  const sendTestNotification = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "notification",
          data: {
            title: "Test Notification",
            message: testMessage,
            type: "info",
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  const sendTestMessage = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          data: {
            from: "Test User",
            content: testMessage,
            timestamp: new Date().toISOString(),
            type: "text",
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test message");
      }
    } catch (error) {
      console.error("Error sending test message:", error);
    }
  };

  const sendCustomEvent = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          data: {
            customField: testMessage,
            timestamp: new Date().toISOString(),
            randomNumber: Math.floor(Math.random() * 1000),
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send custom event");
      }
    } catch (error) {
      console.error("Error sending custom event:", error);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">SSE Test Panel</h2>
        <SSEStatusIndicator isConnected={sse.isConnected} />
      </div>

      {/* Connection Controls */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Connection Controls
        </h3>
        <div className="flex gap-2">
          <button
            onClick={sse.connect}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
            disabled={sse.isConnected}
          >
            Connect
          </button>
          <button
            onClick={sse.disconnect}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
            disabled={!sse.isConnected}
          >
            Disconnect
          </button>
        </div>
        {sse.error && (
          <div className="mt-2 rounded border border-red-300 bg-red-100 p-2 text-red-700">
            Connection Error: {sse.error.type}
          </div>
        )}
      </div>

      {/* Test Message Input */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Test Message
        </h3>
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 bg-white p-2 text-gray-900"
          placeholder="Enter test message..."
        />
        <div className="flex gap-2">
          <button
            onClick={sendTestNotification}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={!sse.isConnected}
          >
            Send Notification
          </button>
          <button
            onClick={sendTestMessage}
            className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50"
            disabled={!sse.isConnected}
          >
            Send Message
          </button>
          <button
            onClick={sendCustomEvent}
            className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-50"
            disabled={!sse.isConnected}
          >
            Send Custom Event
          </button>
        </div>
      </div>

      {/* Display Areas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Notifications */}
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications ({notifications.length})
            </h3>
            <button
              onClick={clearNotifications}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No notifications yet</p>
            ) : (
              notifications.slice(0, 5).map((notification, index) => (
                <div
                  key={index}
                  className="rounded border bg-white p-2 text-sm"
                >
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-gray-600">{notification.message}</div>
                  <div className="text-xs text-gray-400">
                    {notification.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="rounded-lg bg-purple-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Messages ({messages.length})
            </h3>
            <button
              onClick={clearMessages}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet</p>
            ) : (
              messages.slice(-5).map((message, index) => (
                <div
                  key={index}
                  className="rounded border bg-white p-2 text-sm"
                >
                  <div className="font-medium">{message.from}</div>
                  <div className="text-gray-600">{message.content}</div>
                  <div className="text-xs text-gray-400">
                    {message.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Event Log</h3>
            <button
              onClick={() => setEventLog([])}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {eventLog.length === 0 ? (
              <p className="text-sm text-gray-500">No events yet</p>
            ) : (
              eventLog.map((log, index) => (
                <div
                  key={index}
                  className="rounded bg-white p-1 font-mono text-xs text-gray-700"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Last Event Display */}
      {sse.lastEvent && (
        <div className="mt-6 rounded-lg bg-yellow-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Last Event
          </h3>
          <pre className="overflow-x-auto rounded border bg-white p-2 text-sm">
            {JSON.stringify(sse.lastEvent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
