"use client";

import { useEffect, useState } from "react";

export default function SSEClient({ userId }: { userId: any }) {
  const [message, setMessage] = useState("Waiting for message...");

  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:3000/sse/${userId}`);

    eventSource.onmessage = (e) => {
      setMessage(`Default: ${e.data}`);
    };

    eventSource.addEventListener("custom-event", (e) => {
      setMessage(`Custom Event: ${e.data}`);
    });

    eventSource.onerror = () => {
      setMessage("Connection error or closed.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  return (
    <div>
      <h3>Latest SSE Message</h3>
      <p>{message}</p>
    </div>
  );
}
