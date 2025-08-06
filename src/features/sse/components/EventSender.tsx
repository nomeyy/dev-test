"use client";

import { useState } from "react";
import { z } from "zod";

const EventTypeSchema = z.enum([
  "notification",
  "message",
  "system-update",
  "custom",
]);

type EventType = z.infer<typeof EventTypeSchema>;

interface EventSenderProps {
  onSendEvent: (type: string, data: any, targetId?: string) => Promise<void>;
  currentClientId?: string;
}

export function EventSender({
  onSendEvent,
  currentClientId,
}: EventSenderProps) {
  const [eventType, setEventType] = useState<EventType>("message");
  const [customEventType, setCustomEventType] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [targetClientId, setTargetClientId] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (isBroadcast: boolean) => {
    try {
      setIsSending(true);
      const type = eventType === "custom" ? customEventType : eventType;
      await onSendEvent(
        type,
        { text: eventMessage },
        isBroadcast ? undefined : targetClientId,
      );
      setEventMessage("");
    } catch (error) {
      console.error("Failed to send event:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Send Event</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Event Type</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="w-full rounded border bg-white px-3 py-2"
          >
            <option value="message">Message</option>
            <option value="notification">Notification</option>
            <option value="system-update">System Update</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {eventType === "custom" && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Custom Event Type
            </label>
            <input
              type="text"
              value={customEventType}
              onChange={(e) => setCustomEventType(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Enter custom event type"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Message</label>
          <textarea
            value={eventMessage}
            onChange={(e) => setEventMessage(e.target.value)}
            className="h-24 w-full resize-none rounded border px-3 py-2"
            placeholder="Enter your message"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Target Client ID (optional)
          </label>
          <input
            type="text"
            value={targetClientId}
            onChange={(e) => setTargetClientId(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Leave empty to broadcast"
          />
          {currentClientId && (
            <button
              onClick={() => setTargetClientId(currentClientId)}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Use my client ID
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleSend(true)}
            disabled={
              isSending ||
              !eventMessage ||
              (eventType === "custom" && !customEventType)
            }
            className="flex-1 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Broadcast"}
          </button>
          <button
            onClick={() => handleSend(false)}
            disabled={
              isSending ||
              !eventMessage ||
              !targetClientId ||
              (eventType === "custom" && !customEventType)
            }
            className="flex-1 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send to Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
