"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { useSSEContext } from "./SSEProvider";
import { cn } from "@/shared/utils";

interface ClientCountResponse {
  success: boolean;
  clientCount: number;
  message?: string;
}

export function SSEMinimalTest() {
  const { isConnected, lastEvent, events, error, connect, disconnect } =
    useSSEContext();
  const [isLoading, setIsLoading] = useState(false);
  const [clientCount, setClientCount] = useState<number>(0);

  const sendTestEvent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test",
          data: { message: "Hello from SSE!", timestamp: Date.now() },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test event");
      }

      const result = (await response.json()) as ClientCountResponse;
      if (result.clientCount !== undefined) {
        setClientCount(result.clientCount);
      }
    } catch (error) {
      console.error("Error sending test event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientCount = async () => {
    try {
      const response = await fetch("/api/sse/clients");
      if (response.ok) {
        const result = (await response.json()) as ClientCountResponse;
        setClientCount(result.clientCount);
      }
    } catch (error) {
      console.error("Error fetching client count:", error);
    }
  };

  useEffect(() => {
    // Fetch initial client count
    void fetchClientCount();

    // Set up interval to fetch client count every 10 seconds
    const interval = setInterval(() => {
      void fetchClientCount();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header with status */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isConnected ? "bg-emerald-500" : "bg-gray-400",
              )}
            />
            <span className="text-sm font-medium text-gray-700">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {events.length} events • {clientCount} clients
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-4">
        <div className="flex gap-3">
          <Button
            onClick={connect}
            disabled={isConnected}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!isConnected}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Disconnect
          </Button>
          <Button
            onClick={sendTestEvent}
            disabled={!isConnected || isLoading}
            size="sm"
            className="flex-1"
          >
            {isLoading ? "Sending..." : "Send Event"}
          </Button>
          <Button
            onClick={fetchClientCount}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Refresh Count
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-6 py-3">
          <div className="text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
          </div>
        </div>
      )}

      {/* Latest event display */}
      {lastEvent && (
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mb-2 text-sm text-gray-600">Latest Event</div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-1 text-xs text-gray-500">{lastEvent.event}</div>
            <div className="font-mono text-sm break-all text-gray-800">
              {JSON.stringify(lastEvent.data, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Event history */}
      {events.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mb-3 text-sm text-gray-600">Event History</div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {events
              .slice(-5)
              .reverse()
              .map((event, index) => (
                <div key={index} className="rounded bg-gray-50 p-2 text-xs">
                  <div className="mb-1 text-gray-500">{event.event}</div>
                  <div className="truncate font-mono text-gray-700">
                    {JSON.stringify(event.data)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
