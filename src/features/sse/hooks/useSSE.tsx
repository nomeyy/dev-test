import { useEffect, useRef, useState } from "react";
import type { SSEEvent, SSEEventType } from "../types";

export function useSSE(
  url: string,
  reconnectKey?: number,
  manuallyDisconnected?: boolean,
) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [status, setStatus] = useState<"connected" | "disconnected">(
    "disconnected",
  );
  const [clientId, setClientId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (manuallyDisconnected) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setStatus("disconnected");
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
        eventType === "connected" &&
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        typeof (parsed as { id: unknown }).id === "string"
      ) {
        setClientId((parsed as { id: string }).id);
        setStatus("connected");
      } else if (eventType === "ping") {
        setStatus("connected");
      } else if (
        eventType === "client-disconnect" &&
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        (parsed as { id: string }).id === clientId
      ) {
        setStatus("disconnected");
      }
    };

    es.onopen = () => setStatus("connected");
    es.onerror = () => {
      setStatus("disconnected");
      es.close();
    };
    es.onmessage = handleEvent;
    es.addEventListener("clients", handleEvent);
    es.addEventListener("broadcast", handleEvent);
    es.addEventListener("connected", handleEvent);
    es.addEventListener("client-connect", handleEvent);
    es.addEventListener("client-disconnect", handleEvent);
    es.addEventListener("ping", handleEvent);

    return () => {
      es.close();
    };
  }, [url, reconnectKey, manuallyDisconnected]);

  const reset = () => setEvents([]);
  return { events, status, clientId, reset };
}
