"use client";

import type { SSEEvent } from "@/lib/sse";
import { useSSE } from "@/lib/sse/hooks";
import { useState } from "react";

export default function SSEPage() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [message, setMessage] = useState("");

  const { isConnected, connectionId, sendMessage } = useSSE({
    onMessage: (event) => {
      setEvents((prev) => [...prev, event]);
    },
    onError: (error) => {
      console.error("Page error:", error);
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;

    void sendMessage({
      type: "demo-message",
      data: { message: message.trim() },
    });

    setMessage("");
  };

  const handleSendNotification = () => {
    void sendMessage({
      type: "notification",
      data: {
        title: "Demo Notification",
        body: "This is a test notification",
        timestamp: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="rounded-lg bg-gradient-to-b from-[#15162c] to-[#2e026d] p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold">SSE Demo Page</h2>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {connectionId && (
          <p className="text-sm text-gray-400">Connection ID: {connectionId}</p>
        )}
      </div>

      <div className="mb-4">
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !message.trim()}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <button
          onClick={handleSendNotification}
          disabled={!isConnected}
          className="mt-4 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send Notification
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold">Received Events</h3>
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-2">
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No events received yet...</p>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="rounded bg-gray-50 p-2 text-sm">
                  <div className="font-medium text-blue-600">{event.type}</div>
                  <div className="text-gray-700">
                    {JSON.stringify(event.data)}
                  </div>
                  {event?.timestamp && (
                    <div className="mt-1 text-xs text-gray-500">
                      {/*{new Date(event?.timestamp).toLocaleTimeString()}*/}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
