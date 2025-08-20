"use client";
import { useEffect, useRef } from "react";

export function useSSE({
  clientId,
  onEvent,
}: {
  clientId: string;
  onEvent: (ev: { event?: string; data?: any }) => void;
}) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const url = `/api/sse?clientId=${encodeURIComponent(clientId)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("connected", (e: MessageEvent) => {
      try {
        onEvent({ event: "connected", data: JSON.parse(e.data) });
      } catch {}
    });

    es.addEventListener("ping", (e: MessageEvent) => {
      try {
        onEvent({ event: "ping", data: JSON.parse(e.data) });
      } catch {}
    });

    es.onmessage = (e) => {
      try {
        onEvent({ event: "message", data: JSON.parse(e.data) });
      } catch {}
    };

    es.onerror = (err) => {
      onEvent({ event: "error", data: err });
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [clientId, onEvent]);
}
