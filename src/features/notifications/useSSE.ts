"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type SSEMessage = {
  event: string;
  data: any; // the actual payload (with "from" stripped out if present)
  from?: string; // sender extracted out
  receivedAt: number;
};

const BASE_BACKOFF = 1000;
const MAX_BACKOFF = 30_000;
const STALE_THRESHOLD = 60_000;

function tryParse(data: any) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

/**
 * Normalizes incoming event payloads:
 * If the payload is an object containing `from`, extract it separately.
 */
function normalize(event: string, raw: any): Omit<SSEMessage, "receivedAt"> {
  const parsed = tryParse(raw);
  if (parsed && typeof parsed === "object" && parsed !== null && "from" in parsed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { from, ...rest } = parsed as any;
    return { event, data: rest, from };
  }
  return { event, data: parsed };
}

export function useSSE(userId: string | null) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [connected, setConnected] = useState(false);

  const evtSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef<number>(BASE_BACKOFF);
  const lastActivityRef = useRef<number>(Date.now());
  const reconnectTimeoutRef = useRef<number | null>(null);
  const staleCheckIntervalRef = useRef<number | null>(null);

  const resetBackoff = () => {
    backoffRef.current = BASE_BACKOFF;
  };

  const getBackoffWithJitter = () => {
    const exp = Math.min(MAX_BACKOFF, backoffRef.current);
    const jitter = 0.8 + Math.random() * 0.4;
    const delay = Math.floor(exp * jitter);
    backoffRef.current = Math.min(MAX_BACKOFF, backoffRef.current * 2);
    return delay;
  };

  const addMessage = (event: string, rawData: any) => {
    const { data, from } = normalize(event, rawData);
    setMessages((prev) => [
      ...prev,
      { event, data, from, receivedAt: Date.now() },
    ]);
    lastActivityRef.current = Date.now();
  };

  const connect = useCallback(() => {
    if (!userId) return;

    if (evtSourceRef.current) {
      evtSourceRef.current.close();
      evtSourceRef.current = null;
    }

    console.debug("[useSSE] connecting for user:", userId);
    const src = new EventSource(
      `/api/sse?userId=${encodeURIComponent(userId)}`,
      { withCredentials: true }
    );
    evtSourceRef.current = src;

    src.onopen = () => {
      console.debug("[useSSE] open");
      setConnected(true);
      resetBackoff();
      lastActivityRef.current = Date.now();
    };

    src.onmessage = (e) => {
      // default unnamed event
      addMessage("message", e.data);
    };

    src.addEventListener("all", (e: any) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed && typeof parsed === "object" && "name" in parsed) {
          // wrapper
          addMessage(parsed.name, parsed.payload);
        } else {
          addMessage("all", parsed);
        }
      } catch {
        addMessage("all", e.data);
      }
    });

    // explicit listener (optional)
    src.addEventListener("test.event", (e: any) => {
      addMessage("test.event", e.data);
    });

    src.onerror = (err) => {
      console.warn("[useSSE] error, will reconnect", err);
      setConnected(false);
      if (src) src.close();
      const delay = getBackoffWithJitter();
      if (reconnectTimeoutRef.current)
        window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };
  }, [userId]);

  useEffect(() => {
    if (userId) connect();

    staleCheckIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      if (
        evtSourceRef.current &&
        connected &&
        now - lastActivityRef.current > STALE_THRESHOLD
      ) {
        console.debug("[useSSE] stale connection, reconnecting");
        evtSourceRef.current.close();
        setConnected(false);
        connect();
      }
    }, 10_000);

    return () => {
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
        evtSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current)
        window.clearTimeout(reconnectTimeoutRef.current);
      if (staleCheckIntervalRef.current)
        window.clearInterval(staleCheckIntervalRef.current);
    };
  }, [userId, connect, connected]);

  return {
    connected,
    messages,
    latest: messages[messages.length - 1] ?? null,
  };
}
