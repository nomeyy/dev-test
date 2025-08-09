"use client";

import { useRef, useCallback, useState } from "react";
import { getSession } from "next-auth/react";

type EventHandler<T> = (data: T, event: MessageEvent) => void;

export function useSSEControl<T = any>(
  eventNames: string | string[],
  onEvent: EventHandler<T>,
) {
  const esRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    if (esRef.current) return;

    const session = await getSession();
    if (!session?.user) {
      console.warn("No session found, cannot connect to SSE.");
      return;
    }

    const events = Array.isArray(eventNames) ? eventNames : [eventNames];
    const url = `/api/sse/stream?userId=${session.user.id}&name=${session.user.name}`;
    const es = new EventSource(url, { withCredentials: true });

    const handler = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        onEvent(parsed, event);
      } catch {
        onEvent(event.data as unknown as T, event);
      }
    };

    events.forEach((name) => es.addEventListener(name, handler));
    es.onerror = (err) => console.error("SSE connection error:", err);

    esRef.current = es;
    setConnected(true);
  }, [eventNames, onEvent]);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setConnected(false);
    }
  }, []);

  return { connect, disconnect, connected };
}
