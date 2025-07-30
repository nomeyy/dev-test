"use client";

import { useState, useEffect } from "react";

/**
 * Simple test page to verify SSE functionality
 * Shows connection status and displays received messages
 */
export default function SSETestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connectToSSE = () => {
    if (eventSource) {
      eventSource.close();
    }

    setConnectionStatus("connecting");
    setMessages([]);

    const newEventSource = new EventSource("/api/sse");

    newEventSource.onopen = () => {
      console.log("SSE: Connection opened");
      setConnectionStatus("connected");
      setMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Connected to SSE stream`,
      ]);
    };

    newEventSource.onmessage = (event) => {
      console.log("SSE: Message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${data.type}: ${data.message}`,
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Raw: ${event.data}`,
        ]);
      }
    };

    newEventSource.onerror = (error) => {
      console.error("SSE: Error occurred:", error);
      setConnectionStatus("disconnected");
      setMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error: Connection failed`,
      ]);
    };

    setEventSource(newEventSource);
  };

  const disconnectFromSSE = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setConnectionStatus("disconnected");
      setMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Disconnected from SSE stream`,
      ]);
    }
  };

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "disconnected":
        return "text-red-600";
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">SSE Test Page</h1>

      <div className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-lg">Status:</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={connectToSSE}
            disabled={connectionStatus === "connecting"}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {connectionStatus === "connecting"
              ? "Connecting..."
              : "Connect to SSE"}
          </button>

          <button
            onClick={disconnectFromSSE}
            disabled={connectionStatus === "disconnected"}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-gray-50 p-4">
        <h2 className="mb-4 text-xl font-semibold text-gray-600 shadow-sm">
          Messages ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <p className="text-gray-500 italic">
            No messages received yet. Click "Connect to SSE" to start.
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className="rounded border bg-white p-2 font-mono text-sm text-gray-600 shadow-sm"
              >
                {message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>
          <strong>How to test:</strong>
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Click "Connect to SSE" to establish connection</li>
          <li>
            You should see a connection message and a test message after 2
            seconds
          </li>
          <li>Check browser dev tools Network tab to see the SSE stream</li>
          <li>Click "Disconnect" to close the connection</li>
        </ol>
      </div>
    </div>
  );
}
