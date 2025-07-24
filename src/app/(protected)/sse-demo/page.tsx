"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../../features/shared/components/ui/button";
import { Text } from "../../../features/shared/components/ui/text";

const SSE_DEMO_ENDPOINT = "/api/sse";

export default function SSEMessageDemo() {
  const [messages, setMessages] = useState<string[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!subscribed) return;
    const es = new EventSource(SSE_DEMO_ENDPOINT);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      console.log("[SSE-Demo] onmessage event type:", event.type);
      console.log("[SSE-Demo] onmessage event:", event);
      setMessages((prev) => [...prev, event.data]);
    };

    es.addEventListener("connection", (event) => {
      console.log("[SSE-Demo] connection event:", event);
      setMessages((prev) => [...prev, (event as MessageEvent).data]);
    });

    es.addEventListener("heartbeat", (event) => {
      console.log("[SSE-Demo] heartbeat event:", event);
      const data = (event as MessageEvent).data;
      setMessages((prev) => [
        ...prev,
        `💓 Heartbeat received at ${new Date().toLocaleTimeString()} (data: ${data})`,
      ]);
    });

    es.addEventListener("*", (event) => {
      console.log("[SSE-Demo] wildcard event type:", event.type);
      console.log("[SSE-Demo] wildcard event:", event);
      setMessages((prev) => [...prev, (event as MessageEvent).data]);
    });

    es.addEventListener("notification", (event) => {
      console.log("notification event", event);
      setMessages((prev) => [...prev, event.data]);
    });

    es.onopen = (event) =>
      console.log("[SSE-Demo] SSE connection opened", event);
    es.onerror = (event) => console.error("[SSE-Demo] SSE error", event);

    return () => {
      es.close();
    };
  }, [subscribed]);

  const handleSubscribe = () => {
    setSubscribed(true);
  };

  const handleUnsubscribe = () => {
    setSubscribed(false);
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  return (
    <div className="mx-auto mt-10 max-w-lg rounded border bg-white p-6 shadow">
      <h1 className="mb-4 text-xl font-bold">SSE Demo</h1>
      <div className="mb-4 flex gap-2">
        {!subscribed ? (
          <Button onClick={handleSubscribe}>Subscribe</Button>
        ) : (
          <Button onClick={handleUnsubscribe}>Unsubscribe</Button>
        )}
        <Button onClick={() => setMessages([])}>Clear Messages</Button>
      </div>
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
      <div className="text-sm text-gray-500">
        Subscription status: {subscribed ? "Subscribed" : "Not Subscribed"}
      </div>
    </div>
  );
}
