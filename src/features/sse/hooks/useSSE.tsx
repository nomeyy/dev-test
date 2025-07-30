import type { SSEEvent, SSEEventType } from "@/types/sse";
import { useEffect, useRef, useState } from "react";
import { EVENT_TYPES } from "@/utils/constants";

export function useSSE(
  url: string,
  reconnectKey?: number,
  manuallyDisconnected?: boolean,
) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [status, setStatus] = useState<
    (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]
  >(EVENT_TYPES.DISCONNECTED);
  const [clientId, setClientId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (manuallyDisconnected) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setStatus(EVENT_TYPES.DISCONNECTED);
      return;
    }
    const es = new EventSource(url);
    eventSourceRef.current = es;

    const handleEvent = (e: MessageEvent) => {
      let parsed: unknown = e.data;
      if (typeof e.data === "string") {
        try {
          parsed = JSON.parse(e.data);
        } catch {}
      }
      const eventType = e.type as SSEEventType;
      const eventObj: SSEEvent = { event: eventType, data: parsed } as SSEEvent;
      setEvents((prev) => [...prev, eventObj]);
      if (
        eventType === EVENT_TYPES.CONNECTED &&
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        typeof (parsed as { id: unknown }).id === "string"
      ) {
        setClientId((parsed as { id: string }).id);
        setStatus(EVENT_TYPES.CONNECTED);
      } else if (eventType === EVENT_TYPES.PING) {
        setStatus(EVENT_TYPES.CONNECTED);
      } else if (
        eventType === EVENT_TYPES.CLIENT_DISCONNECT &&
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        (parsed as { id: string }).id === clientId
      ) {
        setStatus(EVENT_TYPES.DISCONNECTED);
      }
    };

    es.onopen = () => setStatus(EVENT_TYPES.CONNECTED);
    es.onerror = () => {
      setStatus(EVENT_TYPES.DISCONNECTED);
      es.close();
    };
    es.onmessage = handleEvent;
    es.addEventListener(EVENT_TYPES.CLIENTS, handleEvent);
    es.addEventListener(EVENT_TYPES.BROADCAST, handleEvent);
    es.addEventListener(EVENT_TYPES.CONNECTED, handleEvent);
    es.addEventListener(EVENT_TYPES.CLIENT_CONNECT, handleEvent);
    es.addEventListener(EVENT_TYPES.CLIENT_DISCONNECT, handleEvent);
    es.addEventListener(EVENT_TYPES.PING, handleEvent);

    return () => {
      es.close();
    };
  }, [url, reconnectKey, manuallyDisconnected]);

  const reset = () => setEvents([]);
  return { events, status, clientId, reset };
}
