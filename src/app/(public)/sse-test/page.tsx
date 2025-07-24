"use client";

import { useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { useSSE } from "@/features/sse";

export default function SSETestPage() {
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");

  const handleMessage = useCallback((event: any) => {
    setLatestMessage(`${event.event}: ${JSON.stringify(event.data)}`);
  }, []);

  const { isConnected, lastEvent } = useSSE("/api/sse", {
    onMessage: handleMessage,
  });

  const handleTestClick = () => {
    setLatestMessage("Button clicked! SSE connection is working.");
  };

  return (
    <div className="container mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-bold">SSE Demo</h1>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <Button onClick={handleTestClick} className="w-full">
          Test SSE Connection
        </Button>

        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Latest SSE Message:</h2>
          <p className="text-sm text-gray-600">{latestMessage}</p>
        </div>
      </div>
    </div>
  );
}
