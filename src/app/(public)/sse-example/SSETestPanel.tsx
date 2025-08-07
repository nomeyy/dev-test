"use client";

import { useEffect, useState, useRef } from "react";

interface SSEMessage {
  id: string;
  type: "message" | "ping";
  data: string;
  timestamp: string;
}

export default function SSETestPanel() {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [clientId, setClientId] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);

  // Generate or retrieve clientId from sessionStorage
  useEffect(() => {
    let storedClientId = sessionStorage.getItem("sse_client_id");
    if (!storedClientId) {
      storedClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("sse_client_id", storedClientId);
    }
    setClientId(storedClientId);
  }, []);

  // Connect to SSE endpoint
  useEffect(() => {
    if (!clientId) return;

    setConnectionStatus("connecting");

    const eventSource = new EventSource(`/api/sse?clientId=${clientId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus("connected");
      console.log("SSE connection opened");
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setConnectionStatus("error");
    };

    // Listen for 'message' events
    eventSource.addEventListener("message", (event) => {
      const newMessage: SSEMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: "message",
        data: event.data as string,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, newMessage]);
    });

    // Listen for 'ping' events
    eventSource.addEventListener("ping", (event) => {
      const newMessage: SSEMessage = {
        id: `ping_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: "ping",
        data: event.data as string,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, newMessage]);
    });

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus("disconnected");
    };
  }, [clientId]);

  const getStatusColor = () => {
    switch (connectionStatus) {
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

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-gray-800">
          SSE Test Panel
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusIcon()} {connectionStatus.toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-gray-500">Client ID: {clientId}</div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700">
          Messages ({messages.length})
        </h3>
        <button
          onClick={clearMessages}
          className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-300"
        >
          Clear Messages
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No messages received yet. Waiting for SSE events...
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded border-l-4 p-3 ${
                  message.type === "ping"
                    ? "border-blue-400 bg-blue-50"
                    : "border-green-400 bg-green-50"
                }`}
              >
                <div className="mb-1 flex items-start justify-between">
                  <span
                    className={`text-xs font-medium uppercase ${
                      message.type === "ping"
                        ? "text-blue-600"
                        : "text-green-600"
                    }`}
                  >
                    {message.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp}
                  </span>
                </div>
                <div className="font-mono text-sm text-gray-800">
                  {message.data}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
