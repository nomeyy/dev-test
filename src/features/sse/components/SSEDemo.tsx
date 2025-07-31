"use client";

import { useState } from "react";
import { useSSEStatus, useSSEEvents } from "./SSEProvider";
import type { SSEEventType } from "../types";

/**
 * SSE Demo Component
 * Demonstrates SSE functionality with connection status and event handling
 */
export function SSEDemo() {
  const { isConnected, isConnecting, error } = useSSEStatus();
  const { lastEvent, sendEvent, sendToUser } = useSSEEvents();

  const [eventType, setEventType] = useState<SSEEventType>("notification");
  const [eventData, setEventData] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendEvent = async () => {
    if (!eventData.trim()) return;

    setIsSending(true);
    try {
      await sendEvent({
        type: eventType,
        data: { message: eventData },
      });
      setEventData("");
    } catch (error) {
      console.error("Failed to send event:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToUser = async () => {
    if (!eventData.trim() || !targetUserId.trim()) return;

    setIsSending(true);
    try {
      await sendToUser(targetUserId, {
        type: eventType,
        data: { message: eventData },
      });
      setEventData("");
      setTargetUserId("");
    } catch (error) {
      console.error("Failed to send event to user:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h2 className="text-2xl font-bold">SSE Demo</h2>

      {/* Connection Status */}
      <div className="rounded-lg bg-black p-4">
        <h3 className="mb-2 text-lg font-semibold">Connection Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>
              Status:{" "}
              {isConnected
                ? "Connected"
                : isConnecting
                  ? "Connecting..."
                  : "Disconnected"}
            </span>
          </div>
          {error && (
            <div className="text-sm text-red-600">Error: {error.type}</div>
          )}
        </div>
      </div>

      {/* Last Event */}
      {lastEvent && (
        <div className="rounded-lg bg-black p-4">
          <h3 className="mb-2 text-lg font-semibold">Last Event</h3>
          <div className="space-y-1 text-sm">
            <div>
              <strong>Type:</strong> {lastEvent.type}
            </div>
            <div>
              <strong>Data:</strong> {JSON.stringify(lastEvent.data)}
            </div>
            <div>
              <strong>Timestamp:</strong> {lastEvent.timestamp.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Send Event Form */}
      <div className="rounded-lg border bg-black p-4">
        <h3 className="mb-4 text-lg font-semibold">Send Event</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as SSEEventType)}
              className="w-full rounded border p-2"
            >
              <option value="notification">Notification</option>
              <option value="message">Message</option>
              <option value="user.online">User Online</option>
              <option value="user.offline">User Offline</option>
              <option value="user.activity">User Activity</option>
              <option value="system.alert">System Alert</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Event Data (JSON)
            </label>
            <textarea
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              placeholder='{"message": "Hello World"}'
              className="h-20 w-full rounded border p-2"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSendEvent}
              disabled={isSending || !isConnected}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Broadcast Event"}
            </button>

            <button
              onClick={handleSendToUser}
              disabled={isSending || !isConnected}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send to User"}
            </button>
          </div>

          {/* Target User ID for specific user sending */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Target User ID (for specific user)
            </label>
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full rounded border p-2"
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg bg-black p-4">
        <h3 className="mb-2 text-lg font-semibold">Instructions</h3>
        <ul className="space-y-1 text-sm">
          <li>
            • The SSE connection will automatically establish when this
            component mounts
          </li>
          <li>• Events are broadcasted to all connected users by default</li>
          <li>
            • You can send events to specific users by providing a user ID
          </li>
          <li>• The connection will automatically reconnect if disconnected</li>
          <li>• Check the browser console for detailed connection logs</li>
        </ul>
      </div>
    </div>
  );
}
