"use client";

import { useState, useEffect, useMemo } from "react";
import { useSSE, type SSEEventUnion } from "@/features/sse";
import { api } from "@/trpc/react";

// Type definition for connection objects
interface Connection {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: string;
}

const SSETestPage = () => {
  // User ID management - allow users to set their own ID for testing
  const [userId, setUserId] = useState(
    () => `user-${crypto.randomUUID().slice(0, 8)}`,
  );
  const [isEditingUserId, setIsEditingUserId] = useState(false);

  const [eventHistory, setEventHistory] = useState<SSEEventUnion[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [sendTarget, setSendTarget] = useState<
    "current" | "selected" | "broadcast"
  >("current");
  const [connectionLogs, setConnectionLogs] = useState<
    Array<{ timestamp: Date; type: string; message: string }>
  >([]);

  // Custom event form state
  const [customEventName, setCustomEventName] = useState("");
  const [customEventId, setCustomEventId] = useState("");
  const [customEventPayload, setCustomEventPayload] = useState(
    '{"message": "Hello World", "timestamp": "' +
      new Date().toISOString() +
      '"}',
  );

  const addConnectionLog = (type: string, message: string) => {
    setConnectionLogs((prev) => [
      { timestamp: new Date(), type, message },
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  };

  const getErrorDetails = (error: Error) => {
    const details = {
      message: error.message,
      name: error.name,
      suggestions: [] as string[],
    };

    // Provide specific suggestions based on error type
    if (error.message.includes("Failed to fetch")) {
      details.suggestions.push("Check if the server is running");
      details.suggestions.push("Verify the SSE endpoint is accessible");
      details.suggestions.push("Check for CORS issues");
    } else if (error.message.includes("NetworkError")) {
      details.suggestions.push("Check your internet connection");
      details.suggestions.push("Try refreshing the page");
    } else if (error.message.includes("timeout")) {
      details.suggestions.push("Server may be overloaded");
      details.suggestions.push("Try connecting again in a few seconds");
    } else {
      details.suggestions.push("Try disconnecting and reconnecting");
      details.suggestions.push("Check browser console for more details");
    }

    return details;
  };

  const {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    connectionId,
    connect,
    disconnect,
  } = useSSE({
    userId,
    onEvent: (event: SSEEventUnion) => {
      setEventHistory((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
      addConnectionLog("EVENT", `Received ${event.type} event`);
    },
    onConnect: () => {
      console.log("SSE Connected!");
      addConnectionLog(
        "CONNECT",
        `Connected successfully (ID: ${connectionId})`,
      );
    },
    onDisconnect: () => {
      console.log("SSE Disconnected!");
      addConnectionLog("DISCONNECT", "Connection closed");
    },
    onError: (err: Error) => {
      console.error("SSE Error:", err);
      addConnectionLog("ERROR", `Connection error: ${err.message}`);
    },
  });

  // Type assertion for tRPC client - the API is working but showing type errors
  // This is a temporary workaround for tRPC type generation issues
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  const apiTyped = api as any;

  // Get active connections
  const { data: connectionsData, refetch: refetchConnections } =
    apiTyped.sse.getConnections.useQuery(undefined, {
      refetchInterval: 5000, // Refresh every 5 seconds
      enabled: isConnected,
    });

  // Mutations for sending events (flexible - allow any event type)
  const sendToConnectionMutation =
    apiTyped.sse.sendFlexibleEventToConnection.useMutation();
  const sendToConnectionsMutation =
    apiTyped.sse.sendFlexibleEventToConnections.useMutation();
  const broadcastEventMutation =
    apiTyped.sse.broadcastFlexibleEvent.useMutation();
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  const connections = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    () => (connectionsData?.connections ?? []) as Connection[],
    [connectionsData],
  );

  // Auto-refresh connections when connection status changes
  useEffect(() => {
    if (isConnected) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      refetchConnections();
    }
  }, [isConnected, refetchConnections]);

  const sendEventBasedOnTarget = async (
    eventType: string,
    data: Record<string, unknown>,
    customId?: string,
  ) => {
    try {
      // Create the event object
      const event = {
        id: customId ?? crypto.randomUUID(),
        type: eventType,
        timestamp: Date.now(),
        data: data ?? {},
      };

      if (sendTarget === "current" && connectionId) {
        // Send to current connection only
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await sendToConnectionMutation.mutateAsync({
          connectionId,
          event,
        });
      } else if (sendTarget === "selected" && selectedConnections.length > 0) {
        // Send to selected connections
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await sendToConnectionsMutation.mutateAsync({
          connectionIds: selectedConnections,
          event,
        });
      } else if (sendTarget === "broadcast") {
        // Broadcast to all connections
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await broadcastEventMutation.mutateAsync({ event });
      } else {
        throw new Error("Invalid send target or no connections selected");
      }
    } catch (err) {
      console.error("Failed to send event:", err);
      throw err;
    }
  };

  // JSON validation helper
  const isValidJSON = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  // Custom event handler
  const handleSendCustomEvent = async () => {
    try {
      if (!customEventName.trim() || !customEventPayload.trim()) {
        throw new Error("Event name and payload are required");
      }

      if (!isValidJSON(customEventPayload)) {
        throw new Error("Invalid JSON payload");
      }

      const payload = JSON.parse(customEventPayload) as Record<string, unknown>;

      // Use the custom event name as the event type
      await sendEventBasedOnTarget(
        customEventName,
        payload,
        customEventId || undefined,
      );
    } catch (err) {
      console.error("Failed to send custom event:", err);
    }
  };

  const getStatusColor = () => {
    if (isConnecting) return "text-yellow-600";
    if (isConnected) return "text-green-600";
    if (error) return "text-red-600";
    return "text-gray-600";
  };

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (isConnected) return "Connected";
    if (error) return `Error: ${error.message}`;
    return "Disconnected";
  };

  const formatEventData = (event: SSEEventUnion) => {
    return JSON.stringify(event, null, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-center text-5xl font-extrabold tracking-tight">
            SSE Testing Page
          </h1>

          {/* User ID Configuration */}
          <div className="mb-8 rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">User Configuration</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold text-blue-400">
                    🧪 Test User Session
                  </p>
                  <p className="text-sm text-gray-300">
                    Configure your user ID for testing SSE functionality
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">User ID:</span>
                    {isEditingUserId ? (
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onBlur={() => setIsEditingUserId(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setIsEditingUserId(false);
                          }
                        }}
                        className="rounded border border-gray-600 bg-black/50 px-2 py-1 font-mono text-xs text-white"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingUserId(true)}
                        className="rounded border border-gray-600 bg-black/50 px-2 py-1 font-mono text-xs text-white hover:bg-black/70"
                      >
                        {userId}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* User ID Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setUserId(`user-${crypto.randomUUID().slice(0, 8)}`)
                  }
                  className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold transition-colors hover:bg-purple-700"
                >
                  Generate New ID
                </button>
                <button
                  onClick={() => setUserId("test-user-123")}
                  className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-700"
                >
                  Use Default
                </button>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mb-8 rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">Connection Status</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-300">Status:</p>
                <p className={`text-lg font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Connection ID:</p>
                <p className="font-mono text-lg">
                  {connectionId ?? "Not connected"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-300">User ID:</p>
                <p className="font-mono text-lg">{userId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Events Received:</p>
                <p className="text-lg font-semibold">{eventHistory.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Connection Health:</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isConnected
                        ? "bg-green-500"
                        : error
                          ? "bg-red-500"
                          : isConnecting
                            ? "animate-pulse bg-yellow-500"
                            : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm">
                    {isConnected
                      ? "Healthy"
                      : error
                        ? "Error"
                        : isConnecting
                          ? "Connecting"
                          : "Disconnected"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-300">Last Event:</p>
                <p className="font-mono text-sm">
                  {lastEvent
                    ? `${lastEvent.type} (${new Date(lastEvent.timestamp).toLocaleTimeString()})`
                    : "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-8 rounded-lg border border-red-500/50 bg-red-500/20 p-6">
              <h2 className="mb-4 text-2xl font-bold text-red-400">
                Connection Error
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-red-300">Error Message:</p>
                  <p className="rounded bg-red-900/30 p-3 font-mono text-red-200">
                    {error.message}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-red-300">Error Type:</p>
                  <p className="font-mono text-red-200">
                    {error.name || "Unknown Error"}
                  </p>
                </div>

                {/* Error Suggestions */}
                <div>
                  <p className="text-sm text-red-300">
                    Troubleshooting Suggestions:
                  </p>
                  <ul className="mt-2 space-y-1 rounded bg-red-900/30 p-3">
                    {getErrorDetails(error).suggestions.map(
                      (suggestion, index) => (
                        <li key={index} className="text-sm text-red-200">
                          • {suggestion}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                {error.stack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-red-300 hover:text-red-200">
                      Stack Trace (click to expand)
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-red-900/30 p-3 text-xs text-red-200">
                      {error.stack}
                    </pre>
                  </details>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      disconnect();
                      setTimeout(connect, 1000);
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-700"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-700"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `SSE Error: ${error.name}\nMessage: ${error.message}\nStack: ${error.stack ?? "N/A"}`,
                      );
                      addConnectionLog(
                        "INFO",
                        "Error details copied to clipboard",
                      );
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-blue-700"
                  >
                    Copy Error Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Connection Controls */}
          <div className="mb-8 rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">Connection Controls</h2>
            <div className="flex gap-4">
              <button
                onClick={connect}
                disabled={isConnected || isConnecting}
                className="rounded-lg bg-green-600 px-6 py-3 font-semibold transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                Connect
              </button>
              <button
                onClick={disconnect}
                disabled={!isConnected}
                className="rounded-lg bg-red-600 px-6 py-3 font-semibold transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Active Connections & Target Selection */}
          <div className="mb-8 rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Active Connections & Send Target
            </h2>

            {/* Send Target Selection */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold">Send Target:</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sendTarget"
                    value="current"
                    checked={sendTarget === "current"}
                    onChange={(e) =>
                      setSendTarget(
                        e.target.value as "current" | "selected" | "broadcast",
                      )
                    }
                    className="text-blue-600"
                  />
                  <span>Current Connection Only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sendTarget"
                    value="selected"
                    checked={sendTarget === "selected"}
                    onChange={(e) =>
                      setSendTarget(
                        e.target.value as "current" | "selected" | "broadcast",
                      )
                    }
                    className="text-blue-600"
                  />
                  <span>
                    Selected Connections ({selectedConnections.length})
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sendTarget"
                    value="broadcast"
                    checked={sendTarget === "broadcast"}
                    onChange={(e) =>
                      setSendTarget(
                        e.target.value as "current" | "selected" | "broadcast",
                      )
                    }
                    className="text-blue-600"
                  />
                  <span>Broadcast to All ({connections.length})</span>
                </label>
              </div>
            </div>

            {/* Active Connections List */}
            <div>
              <h3 className="mb-3 text-lg font-semibold">
                Active Connections ({connections.length}):
              </h3>
              {connections.length === 0 ? (
                <p className="text-gray-400">No active connections</p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {connections.map((conn: Connection) => (
                    <div
                      key={conn.id}
                      className={`flex items-center gap-3 rounded border p-3 ${
                        conn.id === connectionId
                          ? "border-green-500 bg-green-500/10"
                          : "border-gray-600 bg-black/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(conn.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedConnections([
                              ...selectedConnections,
                              conn.id,
                            ]);
                          } else {
                            setSelectedConnections(
                              selectedConnections.filter(
                                (id) => id !== conn.id,
                              ),
                            );
                          }
                        }}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {conn.id.slice(0, 8)}...
                          </span>
                          {conn.id === connectionId && (
                            <span className="rounded bg-green-600 px-2 py-1 text-xs">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          User: {conn.userId ?? "N/A"} | Connected:{" "}
                          {new Date(conn.connectedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selection Actions */}
            {connections.length > 0 && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() =>
                    setSelectedConnections(
                      connections.map((c: Connection) => c.id),
                    )
                  }
                  className="rounded bg-blue-600 px-3 py-1 text-sm transition-colors hover:bg-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedConnections([])}
                  className="rounded bg-gray-600 px-3 py-1 text-sm transition-colors hover:bg-gray-700"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() =>
                    setSelectedConnections(
                      connections
                        .filter((c: Connection) => c.id !== connectionId)
                        .map((c: Connection) => c.id),
                    )
                  }
                  className="rounded bg-purple-600 px-3 py-1 text-sm transition-colors hover:bg-purple-700"
                >
                  Select Others
                </button>
              </div>
            )}
          </div>

          {/* Test Event Buttons */}
          <div className="mb-8 rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">Send Test Events</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-300">
                {sendTarget === "current" &&
                  "Events will be sent to your current connection only"}
                {sendTarget === "selected" &&
                  `Events will be sent to ${selectedConnections.length} selected connection(s)`}
                {sendTarget === "broadcast" &&
                  `Events will be broadcasted to all ${connections.length} active connection(s)`}
              </p>
            </div>
            {/* Custom Event Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Event Name
                  </label>
                  <select
                    value={customEventName}
                    onChange={(e) => setCustomEventName(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select event type...</option>
                    <option value="system">system</option>
                    <option value="notification">notification</option>
                    <option value="user_update">user_update</option>
                    <option value="reel_upload_status">
                      reel_upload_status
                    </option>
                    <option value="system_message">system_message</option>
                    <option value="custom">custom</option>
                    <option value="test">test</option>
                    <option value="debug">debug</option>
                    <option value="alert">alert</option>
                    <option value="update">update</option>
                    <option value="status">status</option>
                    <option value="message">message</option>
                    <option value="event">event</option>
                    <option value="data">data</option>
                    <option value="info">info</option>
                    <option value="warning">warning</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Event ID (optional)
                  </label>
                  <input
                    type="text"
                    value={customEventId}
                    onChange={(e) => setCustomEventId(e.target.value)}
                    placeholder="Unique event identifier"
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Event Payload (JSON)
                </label>
                <textarea
                  value={customEventPayload}
                  onChange={(e) => setCustomEventPayload(e.target.value)}
                  placeholder='{"message": "Hello World", "timestamp": "2024-01-01T00:00:00Z", "data": {...}}'
                  rows={4}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                {customEventPayload && !isValidJSON(customEventPayload) && (
                  <p className="mt-1 text-sm text-red-400">
                    Invalid JSON format
                  </p>
                )}
              </div>

              <button
                onClick={handleSendCustomEvent}
                disabled={
                  !isConnected ||
                  !customEventName.trim() ||
                  !customEventPayload.trim() ||
                  !isValidJSON(customEventPayload) ||
                  (sendTarget === "current" && !connectionId) ||
                  (sendTarget === "selected" &&
                    selectedConnections.length === 0) ||
                  (sendTarget === "broadcast" && connections.length === 0)
                }
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                Send Custom Event
              </button>
            </div>
          </div>

          {/* Latest Event */}
          {lastEvent && (
            <div className="mb-8 rounded-lg bg-white/10 p-6">
              <h2 className="mb-4 text-2xl font-bold">Latest Event</h2>
              <div className="rounded bg-black/30 p-4">
                <pre className="overflow-x-auto text-sm text-green-400">
                  {formatEventData(lastEvent)}
                </pre>
              </div>
            </div>
          )}

          {/* Connection Lifecycle Logs */}
          <div className="mb-8 rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">Connection Lifecycle</h2>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {connectionLogs.length === 0 ? (
                <p className="py-4 text-center text-gray-400">
                  No connection events yet. Try connecting to see lifecycle
                  events.
                </p>
              ) : (
                connectionLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`rounded p-3 text-sm ${
                      log.type === "ERROR"
                        ? "border-l-4 border-red-500 bg-red-900/30"
                        : log.type === "CONNECT"
                          ? "border-l-4 border-green-500 bg-green-900/30"
                          : log.type === "DISCONNECT"
                            ? "border-l-4 border-yellow-500 bg-yellow-900/30"
                            : "border-l-4 border-blue-500 bg-blue-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            log.type === "ERROR"
                              ? "bg-red-600 text-red-100"
                              : log.type === "CONNECT"
                                ? "bg-green-600 text-green-100"
                                : log.type === "DISCONNECT"
                                  ? "bg-yellow-600 text-yellow-100"
                                  : "bg-blue-600 text-blue-100"
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-gray-200">{log.message}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConnectionLogs([])}
                className="rounded bg-gray-600 px-3 py-1 text-sm transition-colors hover:bg-gray-700"
              >
                Clear Logs
              </button>
              <button
                onClick={() =>
                  addConnectionLog("INFO", "Manual test log entry")
                }
                className="rounded bg-blue-600 px-3 py-1 text-sm transition-colors hover:bg-blue-700"
              >
                Test Log
              </button>
            </div>
          </div>

          {/* Event History */}
          <div className="rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">Event History</h2>
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {eventHistory.length === 0 ? (
                <p className="py-8 text-center text-gray-400">
                  No events received yet. Connect and send some test events!
                </p>
              ) : (
                eventHistory.map((event, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    className="rounded bg-black/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-400">
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="overflow-x-auto text-xs text-gray-300">
                      {formatEventData(event)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSETestPage;
