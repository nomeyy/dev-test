"use client";
import { useEffect } from "react";

const SSEClient = ({ userId }: { userId: string }) => {
  useEffect(() => {
    const sse = new EventSource(`/api/sse?userId=${userId}`);

    sse.onmessage = (event) => {
      console.log("Message:", event.data);
    };

    sse.addEventListener("connected", (event) => {
      console.log("Connected:", event.data);
    });

    sse.onerror = (err) => {
      console.error("SSE error", err);
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [userId]);

  return <p>🔌 Connected to live updates...</p>;
};

export default SSEClient;
