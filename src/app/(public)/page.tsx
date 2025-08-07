"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

type SSEState = "connecting" | "open" | "closed" | "error";
type SSEEvent = MessageEvent;

interface SSEHandlers {
  [eventName: string]: (event: SSEEvent) => void;
}

interface UseSSEOptions {
  clientId?: string;
  userId?: string;
  sessionId?: string;
  handlers: SSEHandlers;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  onStateChange?: (state: SSEState) => void;
  maxRetries?: number;
  retryDelay?: number;
  autoReconnect?: boolean;
  heartbeatTimeout?: number;
}

interface SSEHookReturn {
  sseState: SSEState;
  isConnected: boolean;
  lastHeartbeat?: Date;
  resetConnection: () => void;
  disconnect: () => void;
  sendEvent: (
    event: string,
    data: unknown,
    target?: {
      type: "client" | "broadcast";
      id?: string;
    },
  ) => Promise<boolean>;
}

function useSSE(options: UseSSEOptions): SSEHookReturn {
  const {
    clientId,
    userId,
    sessionId,
    handlers,
    onError,
    onReconnect,
    onStateChange,
    maxRetries = 5,
    retryDelay = 1000,
    autoReconnect = true,
    heartbeatTimeout = 35000,
  } = options;

  const [sseState, setSseState] = useState<SSEState>("closed");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>();

  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isManualDisconnect = useRef(false);

  const updateState = useCallback(
    (newState: SSEState) => {
      setSseState(newState);
      onStateChange?.(newState);
    },
    [onStateChange],
  );

  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current && !isManualDisconnect.current) {
        console.warn("SSE: Heartbeat timeout detected, reconnecting...");
        eventSourceRef.current.close();
        updateState("error");
      }
    }, heartbeatTimeout);
  }, [heartbeatTimeout, updateState]);

  const buildSSEUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId);
    if (userId) params.append("userId", userId);
    if (sessionId) params.append("sessionId", sessionId);

    return `/api/sse?${params.toString()}`;
  }, [clientId, userId, sessionId]);

  const connect = useCallback(() => {
    if (isManualDisconnect.current) return;

    const url = buildSSEUrl();
    const es = new EventSource(url);
    eventSourceRef.current = es;
    updateState("connecting");

    es.onopen = () => {
      updateState("open");
      resetHeartbeatTimeout();
    };

    es.onerror = (event) => {
      updateState("error");
      onError?.(event);

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };

    es.addEventListener("heartbeat", (event) => {
      setLastHeartbeat(new Date());
      resetHeartbeatTimeout();

      if (handlers.heartbeat) {
        handlers.heartbeat(event as MessageEvent);
      }
    });

    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (eventName !== "heartbeat") {
        es.addEventListener(eventName, handler as EventListener);
      }
    });

    return es;
  }, [
    clientId,
    userId,
    sessionId,
    handlers,
    maxRetries,
    retryDelay,
    autoReconnect,
    onError,
    onReconnect,
    updateState,
    resetHeartbeatTimeout,
    buildSSEUrl,
  ]);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    updateState("closed");
  }, [updateState]);

  const resetConnection = useCallback(() => {
    disconnect();
    isManualDisconnect.current = false;

    setTimeout(() => {
      if (!isManualDisconnect.current) {
        connect();
      }
    }, 100);
  }, [disconnect, connect]);

  const sendEvent = useCallback(
    async (
      event: string,
      data: unknown,
      target?: { type: "client" | "broadcast"; id?: string },
    ): Promise<boolean> => {
      try {
        const payload = target
          ? { event, data, target }
          : {
              event,
              data,
              clientId:
                target?.type === "client" ? target.id || clientId : undefined,
            };

        const response = await fetch("/api/sse/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        return result.success || false;
      } catch (error) {
        console.error("Failed to send SSE event:", error);
        return false;
      }
    },
    [clientId, userId, sessionId],
  );

  useEffect(() => {
    isManualDisconnect.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (!eventSourceRef.current) return;

    const es = eventSourceRef.current;

    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (eventName !== "heartbeat") {
        es.removeEventListener(eventName, handler as EventListener);
      }
    });

    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (eventName !== "heartbeat") {
        es.addEventListener(eventName, handler as EventListener);
      }
    });
  }, [handlers]);

  return {
    sseState,
    isConnected: sseState === "open",
    lastHeartbeat,
    resetConnection,
    disconnect,
    sendEvent,
  };
}

// Types for component
type LogEntry = {
  id: string;
  type: string;
  data: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
};

type NotificationData = {
  id?: string;
  title?: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp?: string;
  metadata?: any;
};

const StatusIndicator = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "open":
        return { color: "#10b981", text: "Connected", pulse: true };
      case "connecting":
        return { color: "#f59e0b", text: "Connecting", pulse: true };
      case "error":
        return { color: "#ef4444", text: "Error", pulse: false };
      default:
        return { color: "#6b7280", text: "Disconnected", pulse: false };
    }
  };

  const config = getStatusConfig();
  return (
    <span className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pulse ? "animate-ping" : ""}`}
          style={{ backgroundColor: config.color }}
        />
        <span
          className="relative inline-flex h-3 w-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span className="text-sm font-medium capitalize">{config.text}</span>
    </span>
  );
};

// Icon components
const Bell = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-5 5-5-5h5zm0 0v-5"
    />
  </svg>
);

const Send = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

const Activity = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const Trash2 = ({ className }: { className?: string }) => (
  <svg
    className={className}
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
);

const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg
    className={className}
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
);

export default function SSENotificationPage() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [customEvent, setCustomEvent] = useState({
    event: "notification",
    message: "",
    target: "broadcast",
  });
  const [targetId, setTargetId] = useState("");
  const [clients, setClients] = useState<Record<string, any>>({});

  // Generate unique client and user IDs
  const clientId = useMemo(
    () => `demo-client-${Math.random().toString(36).substr(2, 9)}`,
    [],
  );
  const userId = useMemo(
    () => `user-${Math.random().toString(36).substr(2, 6)}`,
    [],
  );
  const sessionId = useMemo(
    () => `session-${Math.random().toString(36).substr(2, 8)}`,
    [],
  );

  const addLogEntry = useCallback(
    (type: string, data: any, level: LogEntry["level"] = "info") => {
      const entry: LogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type,
        data: typeof data === "string" ? data : JSON.stringify(data, null, 2),
        timestamp: new Date().toLocaleTimeString(),
        level,
      };
      setLog((prev) => [entry, ...prev].slice(0, 100));
    },
    [],
  );

  // Event handlers for different message types
  const handleNotification = useCallback(
    (event: MessageEvent) => {
      try {
        const data: NotificationData = JSON.parse(event.data);
        addLogEntry("notification", data, data.type || "info");

        // Show browser notification if supported
        if (Notification.permission === "granted" && data.title) {
          new Notification(data.title, {
            body: data.message,
            icon: "/favicon.ico",
          });
        }
      } catch (error) {
        addLogEntry("notification", event.data, "info");
      }
    },
    [addLogEntry],
  );

  const handleConnected = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      addLogEntry("connected", data, "success");
    },
    [addLogEntry],
  );

  const handleHeartbeat = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      addLogEntry("heartbeat", `♥ ${data.timestamp}`, "info");
    },
    [addLogEntry],
  );

  const handleError = useCallback(
    (error: Event) => {
      addLogEntry("error", "Connection error occurred", "error");
    },
    [addLogEntry],
  );

  const handleReconnect = useCallback(
    (attempt: number) => {
      addLogEntry("reconnect", `Reconnection attempt #${attempt}`, "warning");
    },
    [addLogEntry],
  );

  // SSE handlers configuration
  const handlers = useMemo(
    () => ({
      connected: handleConnected,
      heartbeat: handleHeartbeat,
      notification: handleNotification,
    }),
    [handleConnected, handleHeartbeat, handleNotification, addLogEntry],
  );

  const {
    sseState,
    isConnected,
    lastHeartbeat,
    resetConnection,
    disconnect,
    sendEvent,
  } = useSSE({
    clientId,
    userId,
    sessionId,
    handlers,
    onError: handleError,
    onReconnect: handleReconnect,
    maxRetries: 5,
    autoReconnect: true,
    heartbeatTimeout: 35000,
  });

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Utility functions for sending different types of events
  const sendTestNotification = useCallback(async () => {
    addLogEntry("client-action", "Sending test notification...", "info");

    const success = await sendEvent("notification", {
      id: `notif-${Date.now()}`,
      title: "Test Notification",
      message: `Hello from ${clientId}! This is a test notification.`,
      type: "info",
      timestamp: new Date().toISOString(),
    });

    if (!success) {
      addLogEntry("client-action", "Failed to send notification", "error");
    }
  }, [clientId, sendEvent, addLogEntry]);

  const sendCustomEvent = useCallback(async () => {
    if (!customEvent.message.trim()) return;

    addLogEntry(
      "client-action",
      `Sending custom '${customEvent.event}' event...`,
      "info",
    );

    let target;
    switch (customEvent.target) {
      case "client":
        target = { type: "client" as const, id: targetId || clientId };
        break;
      default:
        target = { type: "broadcast" as const };
    }

    const success = await sendEvent(
      customEvent.event,
      {
        message: customEvent.message,
        sender: clientId,
        timestamp: new Date().toISOString(),
      },
      target,
    );

    if (!success) {
      addLogEntry("client-action", "Failed to send custom event", "error");
    }

    setCustomEvent((prev) => ({ ...prev, message: "" }));
  }, [
    customEvent,
    targetId,
    clientId,
    userId,
    sessionId,
    sendEvent,
    addLogEntry,
  ]);

  const getLogLevelStyle = (level: LogEntry["level"]) => {
    switch (level) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-blue-700 bg-blue-50 border-blue-200";
    }
  };

  const clearLogs = useCallback(() => {
    setLog([]);
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/sse/clients");
      const data = await res.json();
      const updatedClients = data.clients.filter(
        (client: any) => client.id !== clientId,
      );
      setClients(updatedClients || {});
    } catch (error) {
      console.error("Failed to fetch connections", error);
    }
  };

  useEffect(() => {
    fetchConnections();
    const interval = setInterval(fetchConnections, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                <Bell className="h-8 w-8 text-blue-600" />
                SSE Notification System
              </h1>
              <p className="mt-2 text-gray-600">
                Real-time Server-Sent Events demonstration and testing
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator status={sseState} />
              <div className="flex gap-2">
                <button
                  onClick={resetConnection}
                  disabled={sseState === "connecting"}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </button>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Connection Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Settings className="h-5 w-5" />
            Connection Details
          </h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="font-medium text-gray-700">Client ID:</span>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-black">
                {clientId}
              </code>
            </div>
          </div>
          {lastHeartbeat && (
            <div className="mt-3 text-sm">
              <span className="font-medium text-gray-700">Last Heartbeat:</span>
              <span className="ml-2 text-gray-600">
                {lastHeartbeat.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Send className="h-5 w-5" />
            Event Controls
          </h3>
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={sendTestNotification}
                disabled={!isConnected}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Bell className="h-4 w-4" />
                Send Test Notification
              </button>
            </div>

            {/* Custom Event Form */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div style={{ display: "none" }}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Event Type
                  </label>
                  <select
                    value={customEvent.event}
                    onChange={(e) =>
                      setCustomEvent((prev) => ({
                        ...prev,
                        event: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="notification">Notification</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Target
                  </label>
                  <select
                    value={customEvent.target}
                    onChange={(e) =>
                      setCustomEvent((prev) => ({
                        ...prev,
                        target: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="broadcast">Broadcast</option>
                    <option value="client">Specific Client</option>
                  </select>
                </div>
                {customEvent.target !== "broadcast" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Target ID
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a client</option>
                      {Object.keys(clients).map((clientId) => (
                        <option
                          key={clients[clientId].id}
                          value={clients[clientId].id}
                        >
                          {clients[clientId].id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customEvent.message}
                      onChange={(e) =>
                        setCustomEvent((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      placeholder="Enter message..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === "Enter" && sendCustomEvent()}
                    />
                    <button
                      onClick={sendCustomEvent}
                      disabled={!isConnected || !customEvent.message.trim()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Activity className="h-5 w-5" />
              Event Log ({log.length})
            </h3>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {log.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No events yet. Send a test notification to see logs appear here.
              </div>
            ) : (
              log.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-lg border p-3 ${getLogLevelStyle(entry.level)}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {entry.type}
                    </span>
                    <span className="text-xs opacity-75">
                      {entry.timestamp}
                    </span>
                  </div>
                  <pre className="text-sm break-words whitespace-pre-wrap">
                    {entry.data}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
