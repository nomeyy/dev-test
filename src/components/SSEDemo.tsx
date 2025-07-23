"use client";

import { useState } from "react";
import { useSSE } from "@/features/sse";

/**
 * Demo component to test Server-Sent Events functionality.
 * Shows connection status and allows sending test events.
 */
export function SSEDemo() {
  console.log("[SSEDemo] Component rendering");

  const [userId, setUserId] = useState("demo-user-123");
  const [message, setMessage] = useState("Hello from SSE!");
  const [eventType, setEventType] = useState("notification");

  const { connectionState, lastData, events, error, connect, disconnect } =
    useSSE({
      userId,
      autoReconnect: false, // Start with manual control
      onConnect: () => console.log("SSE Demo: Connected"),
      onDisconnect: () => console.log("SSE Demo: Disconnected"),
      onError: (err) => console.error("SSE Demo: Error", err),
    });

  const sendTestEvent = async () => {
    try {
      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventType,
          data: {
            message,
            timestamp: new Date().toISOString(),
            sender: "demo-ui",
          },
          userId,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        result: string;
      };
      console.log("Send result:", result);
    } catch (error) {
      console.error("Error sending event:", error);
    }
  };

  const broadcastEvent = async () => {
    try {
      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventType,
          data: {
            message: `Broadcast: ${message}`,
            timestamp: new Date().toISOString(),
            sender: "demo-ui",
          },
          broadcast: true,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        result: string;
      };
      console.log("Broadcast result:", result);
    } catch (error) {
      console.error("Error broadcasting event:", error);
    }
  };

  const startExampleJob = async () => {
    try {
      const response = await fetch("/api/sse/example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start_job",
          userId,
          jobId: `job-${Date.now()}`,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };
      console.log("Job start result:", result);
    } catch (error) {
      console.error("Error starting job:", error);
    }
  };

  const sendExampleNotification = async () => {
    try {
      const response = await fetch("/api/sse/example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_notification",
          userId,
          message: `Example notification: ${message}`,
          type: "info",
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };
      console.log("Notification result:", result);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const broadcastAnnouncement = async () => {
    try {
      const response = await fetch("/api/sse/example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "broadcast_announcement",
          message: `System announcement: ${message}`,
          priority: "medium",
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };
      console.log("Announcement result:", result);
    } catch (error) {
      console.error("Error broadcasting announcement:", error);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      case "disconnected":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">SSE Demo</h1>

      {/* Connection Status */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-xl font-semibold">Connection Status</h2>
        <p className={`text-lg font-medium ${getConnectionStatusColor()}`}>
          {connectionState.toUpperCase()}
        </p>
        {error && (
          <p className="mt-2 text-red-600">
            Error: {error.type || "Unknown error"}
          </p>
        )}

        {/* Connection Controls */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={connect}
            disabled={
              connectionState === "connected" ||
              connectionState === "connecting"
            }
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={connectionState === "disconnected"}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700"
            >
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="eventType"
              className="block text-sm font-medium text-gray-700"
            >
              Event Type
            </label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="notification">notification</option>
              <option value="update">update</option>
              <option value="announcement">announcement</option>
              <option value="custom">custom</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700"
            >
              Message
            </label>
            <input
              type="text"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-4 text-xl font-semibold">Actions</h2>

        {/* Basic Actions */}
        <div className="mb-4">
          <h3 className="mb-2 text-lg font-medium">Basic SSE Events</h3>
          <div className="flex flex-wrap gap-2 space-x-4">
            <button
              onClick={sendTestEvent}
              disabled={connectionState !== "connected"}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Send to My User
            </button>
            <button
              onClick={broadcastEvent}
              disabled={connectionState !== "connected"}
              className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Broadcast to All
            </button>
          </div>
        </div>

        {/* Integration Examples */}
        <div>
          <h3 className="mb-2 text-lg font-medium">Integration Examples</h3>
          <div className="flex flex-wrap gap-2 space-x-4">
            <button
              onClick={startExampleJob}
              disabled={connectionState !== "connected"}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Start Example Job
            </button>
            <button
              onClick={sendExampleNotification}
              disabled={connectionState !== "connected"}
              className="rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Send Notification
            </button>
            <button
              onClick={broadcastAnnouncement}
              disabled={connectionState !== "connected"}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Broadcast Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Latest Event */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-xl font-semibold">Latest Event</h2>
        {lastData ? (
          <div className="rounded-md bg-gray-50 p-3">
            <pre className="text-sm whitespace-pre-wrap text-gray-800">
              {JSON.stringify(lastData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">No events received yet</p>
        )}
      </div>

      {/* Event History */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-xl font-semibold">
          Event History ({events.length})
        </h2>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {events.length > 0 ? (
            events
              .slice()
              .reverse()
              .map((event, index) => {
                let eventData: unknown;
                try {
                  eventData = JSON.parse(event.data as string);
                } catch {
                  eventData = event.data;
                }

                return (
                  <div
                    key={events.length - index}
                    className="rounded-md bg-gray-50 p-3"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-sm font-medium text-blue-600">
                        {event.type || "message"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap text-gray-700">
                      {JSON.stringify(eventData, null, 2)}
                    </pre>
                  </div>
                );
              })
          ) : (
            <p className="text-gray-500">No events in history</p>
          )}
        </div>
      </div>
    </div>
  );
}
