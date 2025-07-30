"use client";

import { useState, useEffect } from "react";

interface SSEMessage {
  event: string;
  data: any;
  timestamp: number;
}

export default function SSETestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    connectToSSE();
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const connectToSSE = () => {
    try {
      const es = new EventSource("/api/sse");
      setEventSource(es);

      es.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log("SSE connection opened");
      };

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: "message",
          data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, message]);

        // Extract client ID from connect event
        if (data.clientId) {
          setClientId(data.clientId);
        }
      };

      es.addEventListener("connect", (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: "connect",
          data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, message]);
        setClientId(data.clientId);
      });

      es.addEventListener("notification", (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: "notification",
          data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, message]);
      });

      es.addEventListener("ping", (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: "ping",
          data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, message]);
      });

      es.addEventListener("system_update", (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: "system_update",
          data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, message]);
      });

      es.addEventListener("error", (event) => {
        const message: SSEMessage = {
          event: "error",
          data: { error: "Connection error" },
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, message]);
        setError("SSE connection error");
        setIsConnected(false);
      });

      es.onerror = () => {
        setError("SSE connection failed");
        setIsConnected(false);
      };
    } catch (err) {
      setError("Failed to create SSE connection");
      console.error("SSE connection error:", err);
    }
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
      setClientId(null);
    }
  };

  const sendTestNotification = async () => {
    if (!clientId) {
      alert("No client ID available");
      return;
    }

    try {
      const response = await fetch("/api/sse/test-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          title: "Test Notification",
          message: `Test message sent at ${new Date().toLocaleTimeString()}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Test notification sent successfully!");
      } else {
        alert(`Failed to send notification: ${result.error}`);
      }
    } catch (err) {
      alert("Error sending test notification");
      console.error("Error:", err);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">SSE Test Page</h1>

      {/* Connection Status */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-2 text-xl font-semibold">Connection Status</h2>
        <div className="flex items-center gap-4">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <span className={isConnected ? "text-green-600" : "text-red-600"}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {clientId && (
            <span className="text-gray-600">Client ID: {clientId}</span>
          )}
        </div>
        {error && <div className="mt-2 text-red-600">Error: {error}</div>}
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={isConnected ? disconnect : connectToSSE}
          className={`rounded px-4 py-2 ${isConnected ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"} text-white`}
        >
          {isConnected ? "Disconnect" : "Connect"}
        </button>

        <button
          onClick={sendTestNotification}
          disabled={!isConnected || !clientId}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-400"
        >
          Send Test Notification
        </button>

        <button
          onClick={clearMessages}
          className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
        >
          Clear Messages
        </button>
      </div>

      {/* Messages */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">
          SSE Messages ({messages.length})
        </h2>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages received yet...</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="rounded border bg-gray-50 p-3">
                <div className="mb-1 flex items-start justify-between">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      message.event === "connect"
                        ? "bg-blue-100 text-black"
                        : message.event === "notification"
                          ? "bg-green-100 text-black"
                          : message.event === "ping"
                            ? "bg-yellow-100 text-black"
                            : message.event === "system_update"
                              ? "bg-purple-100 text-black"
                              : message.event === "error"
                                ? "bg-red-100 text-black"
                                : "bg-gray-100 text-black"
                    }`}
                  >
                    {message.event}
                  </span>
                  <span className="text-xs text-black">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="overflow-x-auto text-sm text-black">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-black">Instructions:</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-black">
          <li>Click "Connect" to establish an SSE connection</li>
          <li>Once connected, you can send test notifications</li>
          <li>Watch for ping messages every 30 seconds</li>
          <li>Try disconnecting and reconnecting to test reconnection</li>
          <li>Check the browser console for additional logs</li>
        </ul>
      </div>
    </div>
  );
}
