"use client";

import { useEffect, useState } from "react";
import { Button } from "@/features/shared/components/ui";
import type { SseEvent } from "@/lib/sse/events";
import { SseEventSchema } from "@/lib/sse/events";

interface SseDemoProps {
  userId?: string;
}

export function SseDemo({ userId }: SseDemoProps) {
  const [message, setMessage] = useState("");
  const [channelIds, setChannelIds] = useState("");
  const [sseEvents, setSseEvents] = useState<SseEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      try {
        const parsedData = SseEventSchema.parse(JSON.parse(event.data));
        setSseEvents((prevEvents) => [...prevEvents, parsedData]);
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setError("Connection to SSE server failed. Please refresh the page.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleSendMessage = async () => {
    setError(null);
    try {
      const res = await fetch("/api/sse/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      setMessage("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBroadcast = async () => {
    setError(null);
    try {
      const ids = channelIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        setError("Please enter at least one channel ID.");
        return;
      }

      const res = await fetch("/api/sse/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds: ids, message }),
      });

      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      setMessage("");
      setChannelIds("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border p-4 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">SSE Demo</h2>

      {userId && (
        <div className="mb-4 rounded-md p-2 text-sm">
          <p>Your User ID (for testing):</p>
          <p className="font-mono text-xs">{userId}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border p-2"
          placeholder="Type a message..."
          rows={3}
        />
        <input
          type="text"
          value={channelIds}
          onChange={(e) => setChannelIds(e.target.value)}
          placeholder="User IDs to broadcast (comma-separated)"
          className="w-full rounded-md border p-2"
        />
        <div className="flex justify-end gap-2">
          <Button onClick={handleSendMessage}>Send to Self</Button>
          <Button onClick={handleBroadcast}>Broadcast</Button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-4 h-48 overflow-y-auto rounded-md border p-2">
        <h3 className="text-md mb-2 font-semibold">Received Events:</h3>
        <ul>
          {sseEvents.map((event, index) => (
            <li key={index} className="mt-1 border-b pb-1 text-sm">
              <span className="font-bold capitalize">{event.name}:</span>{" "}
              <span className="font-mono text-xs">
                {JSON.stringify(event.data)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
