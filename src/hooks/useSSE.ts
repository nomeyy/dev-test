"use client";

import { useEffect, useState } from "react";

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function useSSE(clientId?: string) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);

  useEffect(() => {
    // Reset events when clientId changes
    setEvents([]);
    setLastEvent(null);
    setCurrentClientId(null);

    const url = clientId
      ? `/api/sse?clientId=${encodeURIComponent(clientId)}`
      : "/api/sse";
    const eventSource = new EventSource(url);

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

      // Store client ID from connection event
      if (
        sseEvent.event === "connected" &&
        typeof sseEvent.data === "object" &&
        sseEvent.data &&
        "clientId" in sseEvent.data
      ) {
        setCurrentClientId(sseEvent.data.clientId as string);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [clientId]);

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
    currentClientId,
  };
}
