"use client";

import React, { useState, useEffect, useRef } from "react";

interface SSEMessage {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface SSEStatus {
  clientCount: number;
  connectedUsers: string[];
}

export default function SSEPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState("user123");
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [status, setStatus] = useState<SSEStatus | null>(null);
  const [testEvent, setTestEvent] = useState("test-event");
  const [testPayload, setTestPayload] = useState(
    '{"message": "Hello from test!"}',
  );
  const [isClient, setIsClient] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getStatus" }),
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const connectToSSE = () => {
    if (isConnected) {
      disconnectFromSSE();
      return;
    }

    try {
      const source = new EventSource(`/api/sse?userId=${userId}`);
      eventSourceRef.current = source;

      source.onopen = () => {
        setIsConnected(true);
        addMessage("system", { message: "SSE connection opened" });
        fetchStatus();
      };

      source.onerror = (error) => {
        console.error("SSE Error:", error);
        addMessage("error", { message: "SSE connection error" });
        setIsConnected(false);
      };

      source.addEventListener("connected", (event) => {
        const data = JSON.parse(event.data);
        addMessage("connected", data);
      });

      source.addEventListener("ping", (event) => {
        const data = JSON.parse(event.data);
        addMessage("ping", data);
      });

      source.addEventListener("order-complete", (event) => {
        const data = JSON.parse(event.data);
        addMessage("order-complete", data);
      });

      source.addEventListener("alert", (event) => {
        const data = JSON.parse(event.data);
        addMessage("alert", data);
      });

      source.addEventListener("test-event", (event) => {
        const data = JSON.parse(event.data);
        addMessage("test-event", data);
      });

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addMessage("message", data);
        } catch (error) {
          addMessage("message", { raw: event.data });
        }
      };

      const handleGenericEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addMessage(event.type, data);
        } catch (error) {
          addMessage(event.type, { raw: event.data });
        }
      };

      source.addEventListener("helloEvent", handleGenericEvent);
      source.addEventListener("debug-test", handleGenericEvent);
      source.addEventListener("broadcast", handleGenericEvent);
      source.addEventListener("notification", handleGenericEvent);
      source.addEventListener("update", handleGenericEvent);
    } catch (error) {
      console.error("Error connecting to SSE:", error);
      addMessage("error", { message: "Failed to connect to SSE" });
    }
  };

  const disconnectFromSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    addMessage("system", { message: "SSE connection closed" });
  };

  const addMessage = (event: string, data: Record<string, unknown>) => {
    const message: SSEMessage = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const sendToUser = async () => {
    try {
      const payload = JSON.parse(testPayload);
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendToUser",
          userId,
          event: testEvent,
          payload,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addMessage("system", { message: `Sent test message: ${data.message}` });
        fetchStatus();
      } else {
        addMessage("error", { message: `Failed to send: ${data.error}` });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage("error", { message: "Failed to send test message" });
    }
  };

  const broadcastMessage = async () => {
    try {
      const payload = JSON.parse(testPayload);
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          event: testEvent,
          payload,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addMessage("system", { message: `Broadcasted: ${data.message}` });
        fetchStatus();
      } else {
        addMessage("error", { message: `Failed to broadcast: ${data.error}` });
      }
    } catch (error) {
      console.error("Error broadcasting message:", error);
      addMessage("error", { message: "Failed to broadcast message" });
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (!isClient) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold">SSE Tester</h2>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                SSE Dashboard
              </h1>
            </div>

            <div className="mb-6 border-b border-gray-200 pb-6">
              <h2 className="mb-4 text-xl font-semibold">Connection</h2>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Enter user ID"
                  />
                </div>
                <button
                  onClick={connectToSSE}
                  className={`rounded px-6 py-2 font-medium ${
                    isConnected
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {isConnected ? "Disconnect" : "Connect to SSE"}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-3 font-semibold">Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Connection:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span
                        className={`font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}
                      >
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                  {status && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Clients:</span>
                        <span className="font-medium">
                          {status.clientCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Users:</span>
                        <span className="font-medium">
                          {status.connectedUsers.join(", ")}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={fetchStatus}
                    className="mt-3 rounded bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6 border-b border-gray-200 pb-6">
              <h2 className="mb-4 text-xl font-semibold">Messages</h2>
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={testEvent}
                    onChange={(e) => setTestEvent(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="event-name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Payload (JSON)
                  </label>
                  <input
                    type="text"
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder='{"key": "value"}'
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={sendToUser}
                  disabled={!isConnected}
                  className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  Send to User
                </button>
                <button
                  onClick={broadcastMessage}
                  disabled={!isConnected}
                  className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  Broadcast
                </button>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Messages</h2>
                <span className="text-sm text-gray-500">
                  {messages.length} message{messages.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-80 overflow-y-auto rounded-lg border bg-gray-50 p-4">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    No messages yet. Connect to SSE to see messages.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages
                      .slice()
                      .reverse()
                      .map((message, index) => (
                        <div
                          key={messages.length - 1 - index}
                          className="rounded border bg-white p-3"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <span className="font-medium text-blue-600">
                              {message.event}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-sm text-gray-700">
                            {JSON.stringify(message.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
