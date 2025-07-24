"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../../features/shared/components/ui/button";
import { Text } from "../../../features/shared/components/ui/text";

const SSE_DEMO_ENDPOINT = "/api/sse";

export default function SSEMessageDemo() {
  const [messages, setMessages] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_DEMO_ENDPOINT);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };
    es.addEventListener("connection", (event) => {
      setMessages((prev) => [...prev, (event as MessageEvent).data]);
    });
    es.addEventListener("heartbeat", (event) => {
      const data = (event as MessageEvent).data;
      setMessages((prev) => [
        ...prev,
        `💓 Heartbeat received at ${new Date().toLocaleTimeString()} (data: ${data})`,
      ]);
    });
    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="mx-auto mt-10 max-w-lg rounded border bg-white p-6 shadow">
      <h1 className="mb-4 text-xl font-bold">SSE Demo</h1>
      <div className="mb-4 min-h-[2rem] space-y-2">
        {messages.length === 0 ? (
          <Text>No message received yet.</Text>
        ) : (
          messages.map((msg, idx) => (
            <Text as="div" key={idx}>
              {msg}
            </Text>
          ))
        )}
      </div>
      <Button onClick={() => setMessages([])}>Clear Messages</Button>
    </div>
  );
}
