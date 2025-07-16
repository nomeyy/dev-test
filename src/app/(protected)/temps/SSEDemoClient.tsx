"use client";
import { useEffect, useRef, useState } from "react";

export default function SSEDemoClient() {
  const [latest, setLatest] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    eventSourceRef.current = es;
    es.addEventListener("test", (e) => {
      setLatest((e as MessageEvent).data);
    });
    es.addEventListener("message", (e) => {
      setLatest((e as MessageEvent).data);
    });
    es.addEventListener("ping", () => {
      // Heartbeat, can be used for connection status
    });
    es.onerror = () => {
      setLatest("[SSE] Connection error");
    };
    return () => {
      es.close();
    };
  }, []);

  async function sendTest() {
    await fetch("/api/sse/test", { method: "POST" });
  }

  return (
    <div className="space-y-4">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={sendTest}
      >
        Send Test SSE Event
      </button>
      <div className="p-2 border rounded bg-gray-50">
        <strong>Latest SSE message:</strong>
        <div className="mt-1 text-sm text-gray-700 break-all">{latest}</div>
      </div>
    </div>
  );
} 