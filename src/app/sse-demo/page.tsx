"use client";

import { useState } from "react";
import { useSSE } from "@/hooks/useSSE";

export default function SSEDemoPage() {
  const { events, lastEvent, isConnected, sendEvent } = useSSE();
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      void sendEvent("notification", { message: message.trim() });
      setMessage("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">SSE Demo</h1>

      {/* Connection Status */}
      <div className="mb-4 rounded border p-3">
        <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
      </div>

      {/* Send Message */}
      <div className="mb-4 rounded border p-3">
        <h2 className="mb-2 font-semibold">Send Message</h2>
        <div className="flex gap-2">
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
