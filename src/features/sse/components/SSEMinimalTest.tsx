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
  const [targetClientId, setTargetClientId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [eventMessage, setEventMessage] = useState<string>("Test message");
  const [eventType, setEventType] = useState<string>("test");

  const sendTestEvent = async (targetType: "broadcast" | "client" | "user") => {
    setIsLoading(true);
    try {
      const payload: {
        event: string;
        data: { message: string; timestamp: number };
        target?: { clientId?: string; userId?: string };
      } = {
        event: eventType,
        data: { message: eventMessage, timestamp: Date.now() },
      };

      // Add targeting based on type
      if (targetType === "client" && targetClientId) {
        payload.target = { clientId: targetClientId };
      } else if (targetType === "user" && targetUserId) {
        payload.target = { userId: targetUserId };
      }
      // For broadcast, no target needed

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

      {/* Connection Controls */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Connection</h3>
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
              onClick={fetchClientCount}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Refresh Count
            </Button>
          </div>
        </div>

        {/* Connection Info */}
        {isConnected && lastEvent?.event === "connect" && (
          <div className="mt-3 rounded-lg bg-blue-50 p-3">
            <h4 className="mb-2 text-xs font-medium text-blue-700">
              Connection Info
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600">Client ID:</span>
                <code className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                  {typeof lastEvent.data === "object" &&
                  lastEvent.data &&
                  "clientId" in lastEvent.data
                    ? String(lastEvent.data.clientId)
                    : "Unknown"}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-600">User ID:</span>
                <code className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                  {(() => {
                    if (
                      typeof lastEvent.data === "object" &&
                      lastEvent.data &&
                      "userId" in lastEvent.data
                    ) {
                      const userId = lastEvent.data.userId;
                      if (userId === null || userId === undefined) {
                        return "None";
                      }
                      if (typeof userId === "string") {
                        return userId;
                      }
                      if (typeof userId === "number") {
                        return userId.toString();
                      }
                      return "None";
                    }
                    return "None";
                  })()}
                </code>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              💡 Copy these IDs to test specific targeting
            </div>
          </div>
        )}
      </div>

      {/* Event Configuration */}
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          Event Configuration
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">
              Event Type
            </label>
            <input
              type="text"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="test"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Message</label>
            <input
              type="text"
              value={eventMessage}
              onChange={(e) => setEventMessage(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Test message"
            />
          </div>
        </div>
      </div>

      {/* Targeting Controls */}
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Targeting</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">
              Target Client ID (optional)
            </label>
            <input
              type="text"
              value={targetClientId}
              onChange={(e) => setTargetClientId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="client_1234567890_abc123"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">
              Target User ID (optional)
            </label>
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="user123"
            />
          </div>
        </div>
      </div>

      {/* Send Event Controls */}
      <div className="px-6 py-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Send Events</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            onClick={() => sendTestEvent("broadcast")}
            disabled={!isConnected || isLoading}
            size="sm"
            className="w-full"
          >
            {isLoading ? "Sending..." : "Broadcast to All"}
          </Button>
          <Button
            onClick={() => sendTestEvent("client")}
            disabled={!isConnected || isLoading || !targetClientId}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {isLoading ? "Sending..." : "Send to Client"}
          </Button>
          <Button
            onClick={() => sendTestEvent("user")}
            disabled={!isConnected || isLoading || !targetUserId}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {isLoading ? "Sending..." : "Send to User"}
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          • <strong>Broadcast:</strong> Sends to all connected clients
          <br />• <strong>Send to Client:</strong> Sends to specific client ID
          (requires client ID)
          <br />• <strong>Send to User:</strong> Sends to all clients of a
          specific user (requires user ID)
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
