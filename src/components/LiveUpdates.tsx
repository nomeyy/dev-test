"use client";

import React, { useEffect, useState } from "react";
type Props = {
  userId: string;
};

//const userId = "123"; // Replace this with dynamic userId if needed

const LiveUpdates = ({ userId }: Props) => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sse?userId=${userId}`);

    eventSource.onmessage = (event) => {
      console.log("onmessage", event.data);
      setMessages((prev) => [...prev, event.data]);
    };

    eventSource.addEventListener("notification", (event) => {
      console.log("Custom event:", event.data);
      setMessages((prev) => [...prev, event.data]);
    });

    eventSource.addEventListener("ping", () => {
      console.log("💓 Heartbeat received");
    });

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="p-4 border rounded shadow  text-black max-w-xl mx-auto mt-8 bg-white">
      <h2 className="text-xl font-bold mb-4">📡 Live Updates</h2>
      {messages.length === 0 ? (
        <div className="text-gray-500">No message yet.</div>
      ) : (
        <ul className="list-disc pl-6 space-y-2">
          {messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveUpdates;
