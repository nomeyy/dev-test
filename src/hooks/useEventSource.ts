"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type HandlerMap = Record<string, (data: any) => void>;

export function useEventSource(params: { userId?: string; username?: string }) {
  const { userId, username } = params;
  const esRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<HandlerMap>({});
  const [connected, setConnected] = useState(false);

  const addHandler = useCallback(
    (event: string, handler: (data: any) => void) => {
      handlersRef.current[event] = handler;
    },
    [],
  );

  const removeHandler = useCallback((event: string) => {
    delete handlersRef.current[event];
  }, []);

  useEffect(() => {
    const url = `/api/sse?userId=${encodeURIComponent(userId || "")}&username=${encodeURIComponent(username || "")}`;
    const es = new EventSource(url);
    esRef.current = es;

    const onOpen = () => setConnected(true);
    const onError = () => setConnected(false);

    const forward = (eventName: string) => (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        handlersRef.current[eventName]?.(data);
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener("open", onOpen as any);
    es.addEventListener("error", onError as any);
    es.addEventListener("connection-update", forward("connection-update"));
    es.addEventListener("message", forward("message"));

    return () => {
      es.removeEventListener("open", onOpen as any);
      es.removeEventListener("error", onError as any);
      es.removeEventListener("connection-update", forward("connection-update"));
      es.removeEventListener("message", forward("message"));
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [userId, username]);

  return { connected, addHandler, removeHandler };
}
