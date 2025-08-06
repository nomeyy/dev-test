"use client";

import type { LogEntry } from "@/lib/sse/types";
import { api } from "@/trpc/react";
import { useState, useEffect, useRef } from "react";

export default function SSETestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userId, setUserId] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const { mutate } = api.search.broadCast.useMutation();

  const customListeners: {
    type: string;
    handler: EventListenerOrEventListenerObject;
  }[] = [];

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs((prev) => [...prev, newLog]);
  };
  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    addLog("Attempting to connect to SSE...", "info");
    setIsConnected(false);

    const newUserId = crypto.randomUUID();
    setUserId(newUserId);
    mutate({ name: newUserId });
    const eventSource = new EventSource("/api/sse");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      addLog("✅ SSE connection established successfully!", "success");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event?.data as string) as Record<
          string,
          string
        >;
        addLog(
          `📨 ${data.type ?? "message"}: ${JSON.stringify(data, null, 2)}`,
          "data",
        );
      } catch {
        addLog(`📨 Raw message: ${event.data}`, "data");
      }
    };

    // Custom event listener: test
    const testHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event?.data as string) as Record<
          string,
          string
        >;
        console.log("custom event test:", data);
        addLog(`📨 Joined: ${JSON.stringify(data, null, 2)}`, "data");
      } catch {
        console.warn("Failed to parse data:", event.data);
        addLog(`📨 Raw test message: ${event.data}`, "data");
      }
    };
    eventSource.addEventListener("TestBroadCastEvent", testHandler);
    customListeners.push({
      type: "TestBroadCastEvent",
      handler: testHandler as EventListenerOrEventListenerObject,
    });

    eventSource.onerror = (event) => {
      addLog("❌ SSE connection error occurred", "error");
      console.error("SSE Error:", event);
      setIsConnected(false);
    };

    // Wrap .close() to remove listeners and set state
    const originalClose = eventSource.close.bind(eventSource);
    eventSource.close = () => {
      addLog("🔌 SSE connection closed", "info");
      customListeners.forEach(({ type, handler }) => {
        eventSource.removeEventListener(type, handler);
      });
      customListeners.length = 0;
      setIsConnected(false);
      originalClose();
    };
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close(); // Will also clean up listeners via wrapped .close()
      eventSourceRef.current = null;
      addLog("🔌 Manually disconnected", "info");
      setIsConnected(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Auto-connect on component mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getLogTypeStyle = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "border-l-green-500 bg-green-50 text-green-800";
      case "error":
        return "border-l-red-500 bg-red-50 text-red-800";
      case "data":
        return "border-l-blue-500 bg-blue-50 text-blue-800";
      default:
        return "border-l-gray-500 bg-gray-50 text-gray-800";
    }
  };

  return (
    <div className="mx-auto max-w-4xl bg-white p-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">
        SSE Connection Test
      </h1>

      {/* Status Bar */}
      <div
        className={`mb-6 rounded-lg p-4 font-semibold ${
          isConnected
            ? "border border-green-200 bg-green-100 text-green-800"
            : "border border-red-200 bg-red-100 text-red-800"
        }`}
      >
        Status: {isConnected ? "Connected" : "Disconnected"}
        {userId && (
          <div className="mt-1 text-sm font-normal">
            User ID:{" "}
            <code className="rounded bg-white px-2 py-1">{userId}</code>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={connect}
          disabled={isConnected}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Connect
        </button>

        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Disconnect
        </button>

        <button
          onClick={clearLogs}
          className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
        >
          Clear Logs
        </button>
      </div>

      {/* Connection Info */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-700">
            Connection Details
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div>
              Endpoint: <code>/api/sse</code>
            </div>
            <div>Protocol: Server-Sent Events</div>
            <div>State: {isConnected ? "Active" : "Inactive"}</div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-700">Statistics</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Total Logs: {logs.length}</div>
            <div>Errors: {logs.filter((l) => l.type === "error").length}</div>
            <div>
              Data Messages: {logs.filter((l) => l.type === "data").length}
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700">Live Logs</h3>
        </div>

        <div className="h-96 space-y-2 overflow-y-auto bg-gray-50 p-4">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No logs yet. Connect to start receiving messages.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`rounded-r-lg border-l-4 p-3 ${getLogTypeStyle(log.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm break-words whitespace-pre-wrap">
                      {log.message}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-xs opacity-75">
                    {log.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-800">Instructions</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>
            • Click &quot;Connect&quot; to establish SSE connection with the
            server
          </li>
          <li>• You should see connection messages and periodic heartbeats</li>
          <li>
            • Use &quot;Send Test Message&quot; to test bidirectional
            communication
          </li>
          <li>• Monitor the logs to see real-time events</li>
          <li>
            • Check the browser&apos;s Network tab to see the persistent
            connection
          </li>
        </ul>
      </div>
    </div>
  );
}
