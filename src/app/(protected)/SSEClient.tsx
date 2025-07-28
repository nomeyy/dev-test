"use client";

import { useEffect, useState } from "react";

export function SSEClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/sse?userId=${userId}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [
          ...prev,
          `[${e.type}] ${data.message || e.data}`,
        ]);
      } catch {
        setMessages((prev) => [...prev, `[${e.type}] ${e.data}`]);
      }
    };

    es.addEventListener("notification", (e) => {
      const data = JSON.parse(e.data);
      console.log(data);
      setMessages((prev) => [...prev, `[notification] ${data.message}`]);
    });

    es.onerror = (e) => {
      console.error("SSE error", e);
      es.close();
    };

    return () => es.close();
  }, [userId]);

  return (
    <div className="mt-4 space-y-2 rounded-lg bg-black/10 p-4 text-sm">
      <h2 className="font-bold">📡 Live SSE Events</h2>
      {messages.length === 0 && <p className="text-gray-500">No events yet</p>}
      {messages.map((msg, idx) => (
        <div key={idx} className="text-gray-200">
          {msg}
        </div>
      ))}
    </div>
  );
}
