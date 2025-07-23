"use client";

import { useState, useEffect } from "react";
import { useSSE } from "@/hooks/useSSE";

export default function SSEDemoPage() {
  const [clientId, setClientId] = useState("");
  const [targetClientId, setTargetClientId] = useState("");
  const [message, setMessage] = useState("");

  // Get clientId from URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlClientId = urlParams.get("clientId");
      if (urlClientId) {
        setClientId(urlClientId);
      }
    }
  }, []);

  const { events, lastEvent, isConnected, sendEvent, currentClientId } = useSSE(
    clientId || undefined,
  );

  const handleSendMessage = () => {
    if (message.trim()) {
      const target = targetClientId ? "client" : "all";
      const targetId = targetClientId || undefined;
      void sendEvent(
        "notification",
        { message: message.trim() },
        target,
        targetId,
      );
      setMessage("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">SSE Demo</h1>

      {/* Connection Status */}
      <div className="mb-4 rounded border p-3">
        <h3 className="mb-2 font-semibold">Connection Status</h3>
        <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
        {currentClientId && (
          <p className="text-sm text-gray-600">Client ID: {currentClientId}</p>
        )}
      </div>

      {/* Client ID Setup */}
      <div className="mb-4 rounded border p-3">
        <h3 className="mb-2 font-semibold">Client ID Setup</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && e.preventDefault()}
            placeholder="Enter custom client ID (optional)"
            className="flex-1 rounded border px-3 py-2"
          />
          <button
            onClick={() => {
              if (clientId.trim()) {
                window.location.href = `/sse-demo?clientId=${encodeURIComponent(clientId.trim())}`;
              }
            }}
            className="rounded bg-gray-500 px-4 py-2 text-white"
          >
            Connect
          </button>
        </div>
      </div>

      {/* Send Message */}
      <div className="mb-4 rounded border p-3">
        <h2 className="mb-2 font-semibold">Send Message</h2>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message..."
            className="flex-1 rounded border px-3 py-2"
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !message.trim()}
            className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={targetClientId}
            onChange={(e) => setTargetClientId(e.target.value)}
            placeholder="Target client ID (leave empty for all clients)"
            className="flex-1 rounded border px-3 py-2"
          />
        </div>
      </div>

      {/* Latest Event */}
      <div className="mb-4 rounded border p-3">
        <h2 className="mb-2 font-semibold">Latest Event</h2>
        {lastEvent ? (
          <div className="rounded bg-gray-50 p-3">
            <p>
              <strong>Event:</strong> {lastEvent.event}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {new Date(lastEvent.timestamp).toLocaleTimeString()}
            </p>
            <pre className="mt-2 overflow-auto rounded border bg-white p-2 text-sm">
              {JSON.stringify(lastEvent.data, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">No events yet</p>
        )}
      </div>

      {/* Event History */}
      <div className="rounded border p-3">
        <h2 className="mb-2 font-semibold">Event History ({events.length})</h2>
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {events.map((event, index) => (
            <div key={index} className="rounded bg-gray-50 p-2 text-sm">
              <div className="flex justify-between">
                <span className="font-mono">{event.event}</span>
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {JSON.stringify(event.data)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
