import { useEffect, useRef } from "react";

export default function useSSE(
  userId: string | undefined,
  handlers?: {
    onMessage?: (data: any) => void; // for default events (event: message)
    onEvent?: (eventName: string, data: any) => void; // for named events
  },
) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    const es = new EventSource(`/api/sse?id=${encodeURIComponent(userId)}`);
    esRef.current = es;

    // Handle default event ("message")
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers?.onMessage?.(parsed);
      } catch {
        handlers?.onMessage?.(e.data);
      }
    };

    // Handle named events: "connected", "ping", "message", etc.
    es.addEventListener("connected", (e) => {
      try {
        handlers?.onEvent?.("connected", JSON.parse(e.data));
      } catch {
        handlers?.onEvent?.("connected", e.data);
      }
    });

    // es.addEventListener("ping", (e) => {
    //   try {
    //     handlers?.onEvent?.("ping", JSON.parse(e.data));
    //   } catch {
    //     handlers?.onEvent?.("ping", e.data);
    //   }
    // });

    es.addEventListener("message", (e) => {
      // Optional: handle named "message" events as well
      try {
        handlers?.onEvent?.("message", JSON.parse(e.data));
      } catch {
        handlers?.onEvent?.("message", e.data);
      }
    });

    es.onerror = (err) => {
      console.error("SSE error", err);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [userId]);
}
