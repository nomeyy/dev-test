"use client";
import React, { useState, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";

export default function ServerMessage() {
  const [messages, setMessages] = useState<{ event?: string; data?: any }[]>(
    [],
  );

  const handleEvent = useCallback(
    ({ event, data }: { event?: string; data?: any }) => {
      setMessages((prev) => [...prev, { event, data }]);
    },
    [],
  );

  useSSE({
    clientId: "user123",
    onEvent: handleEvent,
  });

  return (
    <div>
      <h2>Listening for server events…</h2>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>
            <strong>{msg.event}:</strong> <p>{msg.data.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
