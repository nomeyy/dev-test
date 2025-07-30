"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useSSE, SSE_EVENTS, type SSEEvent } from "../index";
import { clearSSEEventHistory } from "../utils/sse-utils";

interface SSEDemoProps {
  userId?: string;
  sessionId?: string;
}

export function SSEDemo({ userId, sessionId }: SSEDemoProps) {
  const [testMessage, setTestMessage] = useState("");

  const { isConnected, lastEvent, events, clearEvents } = useSSE({
    userId,
    sessionId,
    onMessage: (event: SSEEvent) => {
      console.log("SSE Demo: Received event:", event);
      if (event.event === "clear_events") {
        console.log("SSE Demo: Events cleared by server");
      }
    },
    onError: (error: Event) => {
      console.error("SSE Demo: Connection error:", error);
    },
    onOpen: () => {
      console.log("SSE Demo: Connection opened");
    },
    onClose: () => {
      console.log("SSE Demo: Connection closed");
    },
  });

  const sendTestMessage = async () => {
    try {
      console.log("SSE Demo: Send Test Message button clicked!");
      console.log("SSE Demo: Sending test message...");
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test_message",
          data: {
            message: testMessage || "Hello from SSE Demo!",
            timestamp: Date.now(),
            userId,
            sessionId,
          },
          target: "all",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      console.log("SSE Demo: Test message sent successfully");
      setTestMessage("");
    } catch (error) {
      console.error("Error sending test message:", error);
    }
  };

  const sendSimpleMessage = async () => {
    try {
      console.log("SSE Demo: Send Simple Message button clicked!");
      console.log("SSE Demo: Sending simple message...");
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "message", // No specific event type
          data: {
            message: "Simple message test",
            timestamp: Date.now(),
          },
          target: "all",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send simple message");
      }

      console.log("SSE Demo: Simple message sent successfully");
    } catch (error) {
      console.error("Error sending simple message:", error);
    }
  };

  const sendNotification = async (
    type: "info" | "success" | "warning" | "error",
  ) => {
    try {
      console.log(`SSE Demo: Send ${type} Notification button clicked!`);
      console.log(`SSE Demo: Sending ${type} notification...`);
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: SSE_EVENTS.NOTIFICATION,
          data: {
            type,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
            message: `This is a ${type} notification sent at ${new Date().toLocaleTimeString()}`,
            timestamp: Date.now(),
          },
          target: "all",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send notification");
      }

      console.log(`SSE Demo: ${type} notification sent successfully`);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">SSE Demo</h2>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm font-medium">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <span className="text-xs text-gray-500">
            Events received: {events.length}
          </span>
          <span className="text-xs text-blue-500">
            Local events: {events.length}
          </span>
          <span className="text-xs text-orange-500">
            Connection: {isConnected ? "✅" : "❌"}
          </span>
        </div>

        {/* Test Message Input */}
        <div className="space-y-2">
          <label htmlFor="test-message" className="text-sm font-medium">
            Test Message:
          </label>
          <div className="flex gap-2">
            <input
              id="test-message"
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter a test message..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <Button onClick={sendTestMessage} disabled={false}>
              Send Message
            </Button>
          </div>
        </div>

        {/* Simple Message Test */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Simple Message Test:</label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={sendSimpleMessage}
              disabled={false}
            >
              Send Simple Message
            </Button>
          </div>
        </div>

        {/* Notification Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Send Notifications:</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => sendNotification("info")}
              disabled={false}
            >
              Info
            </Button>
            <Button
              variant="outline"
              onClick={() => sendNotification("success")}
              disabled={false}
            >
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() => sendNotification("warning")}
              disabled={false}
            >
              Warning
            </Button>
            <Button
              variant="outline"
              onClick={() => sendNotification("error")}
              disabled={false}
            >
              Error
            </Button>
          </div>
        </div>

        {/* Clear Events Buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={clearEvents}
            disabled={events.length === 0}
          >
            Clear Local Events ({events.length})
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              console.log("SSE Demo: Clear All Events button clicked!");
              clearSSEEventHistory();
              // Local events will be cleared automatically via SSE notification
            }}
          >
            Clear All Events (All Browsers)
          </Button>
        </div>
      </div>

      {/* Last Event Display */}
      {lastEvent && (
        <div
          key={`last-event-${lastEvent?._key || lastEvent?.id || "none"}`}
          className="space-y-2"
        >
          <h3 className="text-lg font-semibold">Latest Event:</h3>
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Event:
                </span>
                <span className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">
                  {lastEvent.event}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">ID:</span>
                <span className="text-sm text-gray-800">
                  {lastEvent.id || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Data:</span>
                <pre className="mt-1 overflow-auto rounded border bg-white p-2 text-sm text-gray-800">
                  {JSON.stringify(lastEvent.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Events List */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            All Events ({events.length}):
          </h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {events.map((event: SSEEvent, index: number) => (
              <div
                key={event._key || `event-${index}`}
                className="rounded-lg border bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {event.event}
                  </span>
                  <span className="text-xs text-gray-500">
                    {event.id
                      ? new Date(parseInt(event.id)).toLocaleTimeString()
                      : "Unknown"}
                  </span>
                </div>
                <pre className="overflow-auto text-xs text-gray-800">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
