"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SSEMessage = {
  id: string;
  event: string;
  data: string;
  ts: number;
};

export type UseSSEOptions = {
  url?: string;
  eventNames?: string[]; // e.g. ["message","ping"]
  withCredentials?: boolean;
};

export type UseSSEReturn = {
  connected: boolean;
  messages: SSEMessage[];
};

const genId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) as string;

const DEFAULT_EVENTS = ["message", "ping"] as const;

const useSSE = (opts?: UseSSEOptions): UseSSEReturn => {
  const {
    url = "/api/sse",
    eventNames = [...DEFAULT_EVENTS],
    withCredentials,
  } = opts ?? {};

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SSEMessage[]>([]);

  useEffect(() => {
    // Create EventSource and attach listeners
    const es = new EventSource(url, { withCredentials });

    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => {
      // Let browser's native EventSource auto-reconnect policy handle retries
      setConnected(false);
    });

    const uniqueEvents = Array.from(new Set(["message", ...eventNames]));

    es.onerror = (e) => {
      console.log(e, "EventSource error");
    };

    es.onmessage = (evt: MessageEvent) => {
      const item: SSEMessage = {
        id: genId(),
        event: "message",
        data: evt.data,
        ts: Date.now(),
      };
      setMessages((prev) => [item, ...prev].slice(0, 200));
    };

    for (const name of uniqueEvents) {
      es.addEventListener(name, (evt: MessageEvent) => {
        const item: SSEMessage = {
          id: genId(),
          event: name,
          data: evt.data,
          ts: Date.now(),
        };
        setMessages((prev) => [item, ...prev].slice(0, 200));
      });
    }
    return () => {
      if (es) {
        try {
          es.close();
        } catch {}
      }
    };
  }, []);

  return { connected, messages };
};

export default useSSE;
