"use client";

import { useEffect, useState } from "react";

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function useSSE() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const parsedData = JSON.parse(event.data) as {
        event: string;
        data: Record<string, unknown>;
        timestamp?: number;
      };
      const eventName =
        typeof parsedData.event === "string" ? parsedData.event : "unknown";
      const sseEvent: SSEEvent = {
        event: eventName,
        data: parsedData.data,
        timestamp: parsedData.timestamp ?? Date.now(),
      };

      setLastEvent(sseEvent);
      setEvents((prev) => [...prev, sseEvent]);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const sendEvent = async (
    event: string,
    data: Record<string, unknown>,
    target = "all",
    targetId?: string,
  ) => {
    try {
      await fetch("/api/sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, targetId, event, data } as const),
      });
    } catch (error) {
      console.error("Failed to send SSE event:", error);
    }
  };

  return {
    events,
    lastEvent,
    isConnected,
    sendEvent,
  };
}
