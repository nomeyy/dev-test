import { useEffect } from "react";

export function useSSE(userId: string, onEvent: (event: MessageEvent) => void) {
  useEffect(() => {
    const es = new EventSource(`/api/sse?userId=${userId}`);

    es.onmessage = onEvent;
    es.onerror = (err) => {
      console.error("SSE error:", err);
      es.close();
    };

    return () => es.close();
  }, [userId]);
}
