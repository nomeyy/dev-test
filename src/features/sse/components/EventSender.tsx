"use client";

import { useState } from "react";
import { z } from "zod";
import type {
  SendEventParams,
  SendEventResult,
} from "@/hooks/useSSEConnection";

type EventTarget = "client" | "user" | "session" | "broadcast" | "all";

interface EventSenderProps {
  connected: boolean;
  onSendEvent: <T = unknown>(
    params: SendEventParams<T>,
  ) => Promise<SendEventResult>;
  userId?: string;
  sessionId?: string;
}

export function EventSender({
  connected,
  onSendEvent,
  userId,
  sessionId,
}: EventSenderProps) {
  const [target, setTarget] = useState<EventTarget>("broadcast");
  const [targetId, setTargetId] = useState("");
  const [eventType, setEventType] = useState("notification");
  const [eventData, setEventData] = useState(
    '{"message": "Hello from dashboard!"}',
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      // Parse the event data
      let data: unknown;
      try {
        data = JSON.parse(eventData);
      } catch {
        throw new Error("Invalid JSON in event data");
      }

      // Validate event data with Zod schema
      try {
        // Use specific schema if available for the event type, otherwise use general schema
      } catch (err) {
        if (err instanceof z.ZodError) {
          const issues = err.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ");
          throw new Error(`Validation error: ${issues}`);
        }
        throw new Error("Event data validation failed");
      }

      // Determine target ID
      let finalTargetId = targetId;
      if (target === "user" && !targetId && userId) {
        finalTargetId = userId;
      } else if (target === "session" && !targetId && sessionId) {
        finalTargetId = sessionId;
      }

      const result = await onSendEvent({
        target,
        targetId: finalTargetId || undefined,
        event: {
          type: eventType,
          data,
        },
      });

      setSendSuccess(
        `Event sent successfully! Sent to ${result.data.sentCount} client(s)`,
      );
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send event");
    } finally {
      setSending(false);
    }
  };

  interface EventTemplate {
    name: string;
    type: string;
    data: Record<string, unknown>;
  }

  const getQuickTemplates = (): EventTemplate[] => {
    return [
      {
        name: "Notification",
        type: "notification",
        data: { message: "This is a notification", level: "info" },
      },
      {
        name: "Update",
        type: "update",
        data: { resource: "user", action: "modified", id: "123" },
      },
      {
        name: "Alert",
        type: "alert",
        data: {
          title: "System Alert",
          message: "Something important happened",
          severity: "high",
        },
      },
      {
        name: "Chat Message",
        type: "chat",
        data: {
          user: "Admin",
          message: "Hello everyone!",
          timestamp: Date.now(),
        },
      },
    ];
  };

  const applyTemplate = (template: EventTemplate) => {
    setEventType(template.type);
    setEventData(JSON.stringify(template.data, null, 2));
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Send Event
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Target Selection */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as EventTarget)}
              className="relative z-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="broadcast">Broadcast (All Clients)</option>
              <option value="user">Specific User</option>
              <option value="session">Specific Session</option>
              <option value="client">Specific Client</option>
              <option value="all">All (Alias for Broadcast)</option>
            </select>
          </div>

          {/* Target ID */}
          {(target === "client" ||
            target === "user" ||
            target === "session") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Target ID
                {target === "user" && userId && !targetId && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Will use current: {userId})
                  </span>
                )}
                {target === "session" && sessionId && !targetId && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Will use current: {sessionId})
                  </span>
                )}
              </label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder={
                  target === "client"
                    ? "e.g., client-123"
                    : target === "user"
                      ? "e.g., user-456"
                      : "e.g., session-789"
                }
                className="relative z-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Event Type
            </label>
            <input
              type="text"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g., notification, update, alert"
              className="relative z-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Event Data */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Event Data (JSON)
            </label>
            <textarea
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              rows={6}
              className="relative z-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Quick Templates */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {getQuickTemplates().map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Send Button and Status */}
      <div className="mt-4">
        <button
          onClick={handleSend}
          disabled={!connected || sending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {sending ? "Sending..." : "Send Event"}
        </button>

        {sendError && (
          <div className="mt-2 rounded-md border border-red-300 bg-red-100 p-3 text-red-800">
            {sendError}
          </div>
        )}

        {sendSuccess && (
          <div className="mt-2 rounded-md border border-green-300 bg-green-100 p-3 text-green-800">
            {sendSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
