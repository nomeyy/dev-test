"use client";

import { useState } from "react";
import { useSSE } from "../hooks/useSSE";
import { Button } from "@/features/shared/components/ui/button";

export function SSEDemo() {
  const [messageCount, setMessageCount] = useState(0);
  const {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    connect,
    disconnect,
    reconnect,
  } = useSSE({
    onMessage: (event) => {
      setMessageCount((prev) => prev + 1);
    },
  });

  const handleSendTestMessage = async () => {
    try {
      // This would typically be called from a backend service
      // For demo purposes, we'll simulate it with a fetch call
      await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test-message",
          data: {
            message: `Test message ${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      console.error("Failed to send test message:", error);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-black">SSE Demo</h2>

      {/* Connection Status */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected
                ? "bg-green-500"
                : isConnecting
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium text-black">
            {isConnected
              ? "Connected"
              : isConnecting
                ? "Connecting..."
                : "Disconnected"}
          </span>
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Connection Controls */}
      <div className="mb-4 flex gap-2">
        <Button
          onClick={connect}
          disabled={isConnected || isConnecting}
          className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
          size="sm"
        >
          Connect
        </Button>
        <Button
          onClick={disconnect}
          disabled={!isConnected}
          className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
          size="sm"
        >
          Disconnect
        </Button>
        <Button
          onClick={reconnect}
          disabled={isConnecting}
          className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
          size="sm"
        >
          Reconnect
        </Button>
      </div>

      {/* Test Message Button */}
      <div className="mb-4">
        <Button
          onClick={handleSendTestMessage}
          disabled={!isConnected}
          className="w-full"
        >
          Send Test Message
        </Button>
      </div>

      {/* Message Display */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-black">
          <span>Messages received:</span>
          <span className="font-mono">{messageCount}</span>
        </div>

        {lastEvent && (
          <div className="rounded border bg-gray-50 p-3">
            <div className="mb-1 text-sm font-medium text-black">
              Last Event: {lastEvent.event}
            </div>
            <div className="mb-1 text-xs text-black">
              {new Date(lastEvent.timestamp).toLocaleTimeString()}
            </div>
            <pre className="overflow-auto rounded border bg-white p-2 text-xs text-black">
              {JSON.stringify(lastEvent.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
