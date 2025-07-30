"use client";

import { useEffect, useState } from "react";

export function SSETest() {
  const [isConnected, setIsConnected] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    console.log("SSETest: Component mounted");

    const eventSource = new EventSource("/api/sse?clientId=test-component");

    eventSource.onopen = () => {
      console.log("SSETest: Connection opened");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      console.log("SSETest: Received message", {
        type: event.type,
        data: event.data,
        lastEventId: event.lastEventId,
      });
      setMessageCount((prev) => prev + 1);
    };

    eventSource.onerror = (error) => {
      console.log("SSETest: Connection error", error);
      setIsConnected(false);
    };

    return () => {
      console.log("SSETest: Component unmounting, closing connection");
      eventSource.close();
    };
  }, []);

  return (
    <div className="rounded border p-4">
      <h3>SSE Test Component</h3>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <p>Messages received: {messageCount}</p>
    </div>
  );
}
