"use client";
import React, { useEffect, useRef, useState } from "react";
import { sendDemoEvent } from "../events/events";

/**
 * DemoSSEClient: Minimal UI to test SSE connection and event reception.
 */
interface DemoSSEClientProps {
  id: string | null;
  event: string;
}

const DemoSSEClient = ({ id, event }: DemoSSEClientProps) => {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  useEffect(() => {
    setStatus("connecting");
    setError(null);
    const es = new EventSource(`/api/sse?id=${id}`);
    eventSourceRef.current = es;

    const onEvent = (e: MessageEvent) => {
      console.log(`Received ${event} event:`, e.data);
      try {
        const parsed = JSON.parse(e.data);
        setMessage(parsed.msg || e.data);
      } catch {
        setMessage(e.data);
      }
    };
    const onPing = () => {};
    const onOpen = () => setStatus("open");
    const onError = (e: Event) => {
      setStatus("error");
      setError("Connection lost or failed.");
      es.close();
    };

    es.addEventListener(event, onEvent);
    es.addEventListener("ping", onPing);
    es.onopen = onOpen;
    es.onerror = onError;

    return () => {
      es.removeEventListener(event, onEvent);
      es.removeEventListener("ping", onPing);
      es.close();
    };
  }, [id, event]);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <strong>Status:</strong> {status}
        {error && <span style={{ color: "red", marginLeft: 8 }}>{error}</span>}
      </div>
      <button
        className={`rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20`}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          sendDemoEvent(id, event);
        }}
      >
        Send Demo SSE Event
      </button>
      <div style={{ marginTop: 8 }}>
        Latest SSE message: {message || "No message received yet."}
      </div>
    </div>
  );
};

export default DemoSSEClient;
