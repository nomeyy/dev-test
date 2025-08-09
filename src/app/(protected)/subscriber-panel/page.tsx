"use client";
import { useState, useCallback } from "react";

import { useSSEControl } from "@/hooks/useSSEControl";

export default function SubscriberPanel() {
  const [messages, setMessages] = useState<any[]>([]);

  const handleEvent = useCallback((data: any, event: MessageEvent) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        event: data?.event || "custom",
        data: data?.payload,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  const { connect, disconnect, connected } = useSSEControl(
    ["message", "ping", "broadcast"],
    handleEvent,
  );

  const handleDisconnect = useCallback(() => {
    disconnect();
    setMessages([]);
  }, [disconnect]);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <h1 className="mb-4 text-xl font-semibold">Live SSE Notifications</h1>

      {!connected ? (
        <button
          onClick={connect}
          className="transition-colorsf mb-4 cursor-pointer rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700"
        >
          Connect
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="max-h-[500px] min-w-[300px] overflow-y-auto rounded-lg bg-gray-100 p-4 shadow">
            {messages.length === 0 && (
              <p className="text-gray-500">No notifications received yet...</p>
            )}
            <ul className="space-y-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="rounded border border-gray-200 bg-white p-3 text-center shadow-sm"
                >
                  <div className="text-sm text-gray-600">
                    <strong>{message.event}</strong> - {message.timestamp}
                  </div>
                  <pre className="mt-1 overflow-auto rounded border bg-gray-50 p-2 text-sm whitespace-pre-wrap text-black">
                    {typeof message.data === "string"
                      ? message.data
                      : JSON.stringify(message.data, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleDisconnect}
            className="transition-colorsf mb-4 cursor-pointer rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
