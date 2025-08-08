"use client";

import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  event: string;
  message: string;
  timestamp: number;
  from?: string;
};

export default function ClientPage() {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const generateClientId = async (): Promise<string> => {
    const response = await fetch("/api/sse/generate-id", {
      method: "POST",
    });
    const data = (await response.json()) as { clientId: string };
    return data.clientId;
  };

  const joinConnection = async () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    setIsJoining(true);
    try {
      // Generate unique client ID
      const newClientId = await generateClientId();
      setClientId(newClientId);

      // Connect to SSE
      connectToSSE(newClientId, name.trim());
    } catch (error) {
      console.error("Failed to join:", error);
      alert("Failed to join. Please try again.");
      setIsJoining(false);
    }
  };

  const connectToSSE = (id: string, clientName: string) => {
    setConnectionStatus("connecting");

    const url = `/api/sse/subscribe/${encodeURIComponent(id)}?name=${encodeURIComponent(clientName)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnectionStatus("connected");
      setIsJoining(false);
      console.log("Connected to SSE");
    };

    es.onerror = (error) => {
      console.error("SSE error:", error);
      setConnectionStatus("error");
      setIsJoining(false);
    };

    // Handle connection confirmation
    es.addEventListener("__connected", (e: MessageEvent) => {
      const raw = typeof e.data === "string" ? e.data : String(e.data);
      const data = JSON.parse(raw) as {
        message?: string;
        ts?: number;
        clientId?: string;
        name?: string;
      };
      console.log("Connection confirmed:", data);
    });

    // Handle heartbeat
    es.addEventListener("__heartbeat", (_e: MessageEvent) => {
      // Just log heartbeat, no need to show to user
      console.log("Heartbeat received");
    });

    // Handle notifications
    es.addEventListener("notification", (e: MessageEvent) => {
      try {
        const raw = typeof e.data === "string" ? e.data : String(e.data);
        const data = JSON.parse(raw) as {
          message?: string;
          timestamp?: number;
          from?: string;
        };
        const notification: Notification = {
          id: `${Date.now()}_${Math.random()}`,
          event: "notification",
          message: data.message ?? "No message",
          timestamp: data.timestamp ?? Date.now(),
          from: data.from ?? "system",
        };

        setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep last 50

        // Show browser notification if permission granted
        if (Notification.permission === "granted") {
          new Notification("New Message", {
            body: notification.message,
            icon: "/favicon.ico",
          });
        }
      } catch {
        console.error("Error parsing notification");
      }
    });

    // Handle other custom events
    es.onmessage = (e: MessageEvent) => {
      try {
        const raw = typeof e.data === "string" ? e.data : String(e.data);
        const data = JSON.parse(raw) as { message?: string; from?: string };
        const notification: Notification = {
          id: `${Date.now()}_${Math.random()}`,
          event: "message",
          message: data.message ?? String(e.data),
          timestamp: Date.now(),
          from: data.from ?? "system",
        };

        setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
      } catch {
        // If not JSON, treat as plain text
        const notification: Notification = {
          id: `${Date.now()}_${Math.random()}`,
          event: "message",
          message: String(e.data),
          timestamp: Date.now(),
          from: "system",
        };

        setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
      }
    };
  };

  const disconnect = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnectionStatus("disconnected");
    setClientId(null);
    setNotifications([]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    // Request notification permission on load
    void requestNotificationPermission();

    // Cleanup on unmount
    return () => {
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

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

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Notification Client
            </h1>
            <p className="text-gray-600">
              Connect to receive real-time notifications
            </p>
          </div>

          {/* Connection Section */}
          {!clientId ? (
            <div className="mx-auto max-w-md">
              <div className="rounded-lg bg-gray-50 p-6">
                <h2 className="mb-4 text-center text-xl font-semibold text-gray-800">
                  Join Connection
                </h2>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && joinConnection()}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Enter your name..."
                    disabled={isJoining}
                  />
                </div>

                <button
                  onClick={joinConnection}
                  disabled={isJoining || !name.trim()}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {isJoining ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Status Bar */}
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div
                        className={`mr-2 h-3 w-3 rounded-full ${
                          connectionStatus === "connected"
                            ? "bg-green-500"
                            : connectionStatus === "connecting"
                              ? "bg-yellow-500"
                              : connectionStatus === "error"
                                ? "bg-red-500"
                                : "bg-gray-500"
                        }`}
                      ></div>
                      <span className={`font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600">
                      <strong>Name:</strong> {name}
                    </div>

                    <div className="text-sm text-gray-600">
                      <strong>ID:</strong>{" "}
                      <code className="rounded bg-gray-200 px-1 text-xs">
                        {clientId?.slice(0, 12)}...
                      </code>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={clearNotifications}
                      className="rounded bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600"
                    >
                      Clear
                    </button>
                    <button
                      onClick={disconnect}
                      className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Notifications
                  </h2>
                  <span className="text-sm text-gray-500">
                    {notifications.length} message
                    {notifications.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="text-gray-500">No notifications yet</div>
                      <div className="mt-1 text-sm text-gray-400">
                        Waiting for messages from admin...
                      </div>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="rounded-r-lg border-l-4 border-blue-400 bg-blue-50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center">
                              <span className="mr-2 text-sm font-medium text-blue-800">
                                {notification.event}
                              </span>
                              {notification.from && (
                                <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-500">
                                  from: {notification.from}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800">
                              {notification.message}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0 text-xs text-gray-500">
                            {formatTime(notification.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
