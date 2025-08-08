"use client";

import { useState, useEffect, useRef } from "react";

export default function SSEDebugPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | undefined>();
  const [connectionTime, setConnectionTime] = useState<Date | undefined>();

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    try {
      addMessage("Starting SSE connection...");

      const url = `/api/sse`;
      addMessage(`Connecting to: ${url}`);

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        addMessage("✅ Connection opened successfully");
        setIsConnected(true);
        setConnectionTime(new Date());
      };

      eventSource.onmessage = (event) => {
        try {
          addMessage(`📨 Received: ${event.type} - ${event.data}`);

          const data = JSON.parse(event.data);

          if (event.type === "connected" && data?.clientId) {
            setClientId(data.clientId);
            addMessage(`🔗 Client ID: ${data.clientId}`);
          }
        } catch (error) {
          addMessage(`❌ Error parsing message: ${error}`);
        }
      };

      eventSource.onerror = (error) => {
        addMessage(`❌ Connection error: ${error.type}`);
        setIsConnected(false);
      };

      return () => {
        addMessage("🔌 Cleaning up connection");
        eventSource.close();
      };
    } catch (error) {
      addMessage(`❌ Failed to create connection: ${error}`);
    }
  }, []);

  const sendTestEvent = async (eventType: string) => {
    try {
      addMessage(`🚀 Sending ${eventType} event...`);

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventType,
          data: {
            message: `Test ${eventType} event`,
            timestamp: new Date().toISOString(),
          },
          broadcast: true,
        }),
      });

      const result = await response.json();
      addMessage(`📤 ${eventType} event sent: ${JSON.stringify(result)}`);
    } catch (error) {
      addMessage(`❌ Error sending ${eventType} event: ${error}`);
    }
  };

  const checkStatus = async () => {
    try {
      addMessage("📊 Checking SSE status...");

      const response = await fetch("/api/sse/status");
      const result = await response.json();

      addMessage(`📊 Status: ${JSON.stringify(result.stats)}`);
    } catch (error) {
      addMessage(`❌ Error checking status: ${error}`);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">SSE Debug</h1>

      {/* Connection Status */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span>
            <span
              className={`ml-2 rounded px-2 py-1 text-xs ${
                isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div>
            <span className="font-medium">Client ID:</span>
            <span className="ml-2 font-mono text-xs">{clientId || "N/A"}</span>
          </div>
          <div>
            <span className="font-medium">Connection Time:</span>
            <span className="ml-2 text-xs">
              {connectionTime?.toLocaleTimeString() || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Test Controls</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <button
            onClick={() => sendTestEvent("notification")}
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Send Notification
          </button>
          <button
            onClick={() => sendTestEvent("update")}
            className="rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
          >
            Send Update
          </button>
          <button
            onClick={() => sendTestEvent("alert")}
            className="rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600"
          >
            Send Alert
          </button>
          <button
            onClick={() => sendTestEvent("broadcast")}
            className="rounded bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600"
          >
            Send Broadcast
          </button>
          <button
            onClick={checkStatus}
            className="rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
          >
            Check Status
          </button>
        </div>
      </div>

      {/* Debug Messages */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">
          Debug Messages ({messages.length})
        </h2>
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className="rounded bg-gray-50 p-2 font-mono text-xs"
              >
                {message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
