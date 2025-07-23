"use client";
import React, { useEffect, useState } from "react";

export default function SSETest() {
  const [message, setMessage] = useState("No message yet");

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => setMessage(e.data);
    es.addEventListener("notification", (e: MessageEvent) =>
      setMessage(e.data),
    );
    es.addEventListener("ping", () => {});
    return () => es.close();
  }, []);

  const sendTest = async () => {
    await fetch("/api/sse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "notification",
        data: { text: "Hello from broadcast!" },
      }),
    });
  };

  return (
    <div>
      <button onClick={sendTest}>Send Test Event</button>
      <div>Latest SSE message: {message}</div>
    </div>
  );
}
