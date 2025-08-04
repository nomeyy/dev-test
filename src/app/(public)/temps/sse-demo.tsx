"use client";

import { useState, useEffect } from "react";
import { useSSE, ActiveConnections } from "@/features/sse";

export default function SSEDemo() {
  const [userId, setUserId] = useState("demo-user-123");
  const [eventLog, setEventLog] = useState<
    Array<{ timestamp: string; event: string; data: unknown }>
  >([]);
  const [notificationType, setNotificationType] = useState("broadcast");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("SSEDemo: userId changed to:", userId);
  }, [userId]);

  const {
    isConnected,
    isConnecting,
    lastEvent,
    error,
    reconnectAttempts,
    addEventListener,
  } = useSSE({
    userId,
    metadata: { page: "demo" },
  });

  // Log all events
  useEffect(() => {
    const unsubscribes = [
      addEventListener("connected", (event) => {
        console.log("Connected event received:", event.data);
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "connected",
            data: event.data,
          },
        ]);
      }),
      addEventListener("demo", (event) => {
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "demo",
            data: event.data,
          },
        ]);
      }),
      addEventListener("system", (event) => {
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "system",
            data: event.data,
          },
        ]);
      }),
      addEventListener("update", (event) => {
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "update",
            data: event.data,
          },
        ]);
      }),
      addEventListener("progress", (event) => {
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "progress",
            data: event.data,
          },
        ]);
      }),
      addEventListener("success", (event) => {
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "success",
            data: event.data,
          },
        ]);
      }),
      addEventListener("error", (event) => {
        setEventLog((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            event: "error",
            data: event.data,
          },
        ]);
      }),
    ];

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [addEventListener]);

  const sendNotification = async () => {
    if (
      !message &&
      !["broadcast", "system", "update", "progress"].includes(notificationType)
    ) {
      alert("Please enter a message");
      return;
    }

    setIsSending(true);
    try {
      const payload: Record<string, unknown> = {
        type: notificationType,
        message: message || `Demo ${notificationType} message`,
      };

      if (notificationType === "user") {
        payload.userId = userId;
      }

      if (notificationType === "progress") {
        payload.operationId = "demo-operation";
        payload.progress = Math.floor(Math.random() * 100);
      }

      if (notificationType === "update") {
        payload.data = { demoData: "This is demo update data" };
      }

      const response = await fetch("/api/sse/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Notification sent:", result);
      setMessage("");
    } catch (error) {
      console.error("Failed to send notification:", error);
      alert("Failed to send notification");
    } finally {
      setIsSending(false);
    }
  };

  const clearLog = () => {
    setEventLog([]);
  };

  const getConnectionStatus = () => {
    if (isConnecting) return "🔄 Connecting...";
    if (isConnected) return "✅ Connected";
    if (error) return `❌ Error: ${error}`;
    return "⚪ Disconnected";
  };

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-white">
          Server-Sent Events (SSE) Demo
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Connection Status & Controls */}
          <div className="space-y-6">
            <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Connection Status
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-200">
                  <span className="font-medium">Status:</span>{" "}
                  {getConnectionStatus()}
                </p>
                <p className="text-sm text-gray-200">
                  <span className="font-medium">Reconnect Attempts:</span>{" "}
                  {reconnectAttempts}
                </p>
                <p className="text-sm text-gray-200">
                  <span className="font-medium">User ID:</span> {userId}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Send Test Notification
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200">
                    User ID (for user-specific notifications)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-white/30 bg-white/20 px-3 py-2 text-white placeholder-gray-300 shadow-sm backdrop-blur-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      placeholder="Enter user ID"
                    />
                    <button
                      onClick={() => setUserId("demo-user-123")}
                      className="mt-1 rounded-md bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200">
                    Notification Type
                  </label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-white/30 bg-white/20 px-3 py-2 text-white placeholder-gray-300 shadow-sm backdrop-blur-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                  >
                    <option
                      value="broadcast"
                      className="bg-gray-800 text-white"
                    >
                      Broadcast (All Users)
                    </option>
                    <option value="user" className="bg-gray-800 text-white">
                      User Specific
                    </option>
                    <option value="system" className="bg-gray-800 text-white">
                      System Notification
                    </option>
                    <option value="update" className="bg-gray-800 text-white">
                      Real-time Update
                    </option>
                    <option value="progress" className="bg-gray-800 text-white">
                      Progress Update
                    </option>
                    <option value="success" className="bg-gray-800 text-white">
                      Success Notification
                    </option>
                    <option value="error" className="bg-gray-800 text-white">
                      Error Notification
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200">
                    Message
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-white/30 bg-white/20 px-3 py-2 text-white placeholder-gray-300 shadow-sm backdrop-blur-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    placeholder="Enter your message"
                  />
                </div>

                <button
                  onClick={sendNotification}
                  disabled={isSending || !isConnected}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Latest Event
              </h2>
              {lastEvent ? (
                <div className="rounded bg-white/20 p-3 backdrop-blur-sm">
                  <p className="text-sm text-gray-200">
                    <span className="font-medium">Event:</span>{" "}
                    {lastEvent.event || "message"}
                  </p>
                  <p className="text-sm text-gray-200">
                    <span className="font-medium">Data:</span>
                  </p>
                  <pre className="mt-1 overflow-auto text-xs text-gray-300">
                    {JSON.stringify(lastEvent.data, null, 2)}
                  </pre>
                  {lastEvent.timestamp && (
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(lastEvent.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No events received yet</p>
              )}
            </div>
          </div>

          {/* Event Log */}
          <div className="space-y-6">
            <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Event Log</h2>
                <button
                  onClick={clearLog}
                  className="rounded border border-white/30 bg-white/20 px-3 py-1 text-sm text-gray-200 backdrop-blur-sm hover:bg-white/30"
                >
                  Clear Log
                </button>
              </div>

              <div className="max-h-96 space-y-2 overflow-y-auto">
                {eventLog.length === 0 ? (
                  <p className="text-gray-400">No events logged yet</p>
                ) : (
                  eventLog
                    .slice()
                    .reverse()
                    .map((logEntry, index) => (
                      <div
                        key={index}
                        className="rounded border-l-4 border-blue-400 bg-blue-500/20 p-3 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-200">
                            {logEntry.event}
                          </span>
                          <span className="text-xs text-blue-300">
                            {new Date(logEntry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="mt-1 overflow-auto text-xs text-blue-100">
                          {JSON.stringify(logEntry.data, null, 2)}
                        </pre>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setNotificationType("broadcast");
                    setMessage("Hello from broadcast!");
                    sendNotification();
                  }}
                  disabled={!isConnected}
                  className="rounded border border-green-400/30 bg-green-500/20 px-3 py-2 text-sm text-green-200 backdrop-blur-sm hover:bg-green-500/30 disabled:opacity-50"
                >
                  Quick Broadcast
                </button>
                <button
                  onClick={() => {
                    setNotificationType("system");
                    setMessage("System maintenance in 5 minutes");
                    sendNotification();
                  }}
                  disabled={!isConnected}
                  className="rounded border border-yellow-400/30 bg-yellow-500/20 px-3 py-2 text-sm text-yellow-200 backdrop-blur-sm hover:bg-yellow-500/30 disabled:opacity-50"
                >
                  System Alert
                </button>
                <button
                  onClick={() => {
                    setNotificationType("success");
                    setMessage("Operation completed successfully!");
                    sendNotification();
                  }}
                  disabled={!isConnected}
                  className="rounded border border-green-400/30 bg-green-500/20 px-3 py-2 text-sm text-green-200 backdrop-blur-sm hover:bg-green-500/30 disabled:opacity-50"
                >
                  Success Message
                </button>
                <button
                  onClick={() => {
                    setNotificationType("error");
                    setMessage("Something went wrong!");
                    sendNotification();
                  }}
                  disabled={!isConnected}
                  className="rounded border border-red-400/30 bg-red-500/20 px-3 py-2 text-sm text-red-200 backdrop-blur-sm hover:bg-red-500/30 disabled:opacity-50"
                >
                  Error Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Connections Section */}
        <div className="mt-8">
          <div className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
            <ActiveConnections />
          </div>
        </div>
      </div>
    </div>
  );
}
