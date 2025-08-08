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
        return "from-green-400 to-emerald-500";
      case "connecting":
        return "from-yellow-400 to-orange-500";
      case "error":
        return "from-red-400 to-red-500";
      default:
        return "from-gray-400 to-gray-500";
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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Animated Background Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/5 h-72 w-72 animate-pulse rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute right-1/5 bottom-1/3 h-96 w-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 h-64 w-64 animate-pulse rounded-full bg-pink-500/10 blur-3xl delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-white/20 bg-white/10 p-12 shadow-2xl backdrop-blur-xl">
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 shadow-2xl">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5-5-5h5V12H9l4-4 4 4h-2v5z"
                />
              </svg>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-4xl font-bold text-transparent">
                Notification Client
              </h1>
              <p className="mt-2 text-lg text-purple-200">
                Connect to receive real-time notifications
              </p>
            </div>
          </div>
        </div>

        {/* Connection Section */}
        {!clientId ? (
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl border border-indigo-300/30 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-8 shadow-2xl backdrop-blur-sm">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-400 to-purple-400 shadow-xl">
                  <svg
                    className="h-10 w-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1z"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  Join Connection
                </h2>
                <p className="text-indigo-200">
                  Enter your name to get started
                </p>
              </div>

              <div className="mb-8 space-y-3">
                <label className="block text-sm font-bold text-indigo-200">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && joinConnection()}
                  className="w-full rounded-xl border border-indigo-300/30 bg-white/10 px-5 py-4 text-lg text-white placeholder-white/60 backdrop-blur-sm transition-all duration-300 focus:border-transparent focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter your name..."
                  disabled={isJoining}
                />
              </div>

              <button
                onClick={joinConnection}
                disabled={isJoining || !name.trim()}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-indigo-600 hover:to-purple-600 disabled:scale-100 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
              >
                <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-1000 group-hover:translate-x-full"></div>
                <span className="relative flex items-center justify-center space-x-3">
                  {isJoining ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>Connect</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Status Bar */}
            <div className="mb-8 rounded-2xl border border-white/20 bg-gradient-to-r from-gray-500/10 to-gray-600/10 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 space-x-6">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`relative h-4 w-4 rounded-full bg-gradient-to-r ${getStatusColor()} shadow-lg`}
                    >
                      {connectionStatus === "connecting" && (
                        <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                      )}
                      {connectionStatus === "connected" && (
                        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-green-400 to-emerald-500"></div>
                      )}
                    </div>
                    <span className="text-lg font-bold text-white">
                      {getStatusText()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-400 to-pink-400">
                      <span className="text-sm font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-indigo-200">{name}</span>
                  </div>

                  <div className="text-indigo-200">
                    <span className="font-medium">ID:</span>{" "}
                    <code className="rounded-lg border border-indigo-400/30 bg-indigo-900/40 px-2 py-1 font-mono text-xs">
                      {clientId?.slice(0, 12)}...
                    </code>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={clearNotifications}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-orange-600 hover:to-red-600"
                  >
                    <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-500 group-hover:translate-x-full"></div>
                    <span className="relative flex items-center space-x-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Clear</span>
                    </span>
                  </button>
                  <button
                    onClick={disconnect}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-red-600 hover:to-pink-600"
                  >
                    <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-500 group-hover:translate-x-full"></div>
                    <span className="relative flex items-center space-x-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Disconnect</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-8 shadow-xl backdrop-blur-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-400 to-cyan-400">
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-5 5-5-5h5V12H9l4-4 4 4h-2v5z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Notifications
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 px-4 py-2 font-bold text-white shadow-lg">
                    {notifications.length} message
                    {notifications.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar max-h-96 space-y-4 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-gray-400 to-gray-500 opacity-50 shadow-xl">
                      <svg
                        className="h-10 w-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <div className="mb-2 text-xl font-bold text-white/80">
                      No notifications yet
                    </div>
                    <div className="text-sm text-white/60">
                      Waiting for messages from admin...
                    </div>
                    <div className="mt-4 flex justify-center">
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 delay-100"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 delay-200"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="group transform transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <div className="border-gradient-to-b rounded-2xl border border-l-4 border-blue-300/30 bg-gradient-to-r from-blue-500/30 from-cyan-400 to-blue-400 to-cyan-500/30 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-3 flex items-center space-x-3">
                              <div className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1 text-xs font-bold text-white shadow-lg">
                                {notification.event}
                              </div>
                              {notification.from && (
                                <div className="rounded-full bg-gradient-to-r from-purple-400 to-pink-400 px-3 py-1 text-xs font-bold text-white shadow-lg">
                                  from: {notification.from}
                                </div>
                              )}
                            </div>
                            <p className="text-lg leading-relaxed font-medium text-white">
                              {notification.message}
                            </p>
                          </div>
                          <div className="ml-6 flex-shrink-0">
                            <div className="rounded-full border border-blue-400/20 bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-200">
                              {formatTime(notification.timestamp)}
                            </div>
                          </div>
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

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #06b6d4);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #0891b2);
        }
      `}</style>
    </div>
  );
}
