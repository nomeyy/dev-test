"use client";
import { useEffect, useState } from "react";

export default function SSEClient(props: { id: string }) {
  const [message, setMessage] = useState("No message received.");

  useEffect(() => {
    console.log("useEffect");
    console.log(props);
    const sse = new EventSource(`/api/sse?clientId=${props.id}`);
    sse.addEventListener("update", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setMessage(data.message);
    });
    sse.onerror = () => sse.close();
    return () => sse.close();
  }, []);

  return (
    <div style={{ margin: 20 }}>
      <button
        style={{
          padding: 10,
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: 5,
        }}
        onClick={() => fetch("/api/send-message", { method: "POST" })}
      >
        Trigger SSE from Server
      </button>
      <div style={{ marginTop: 20, fontSize: 18 }}>Latest: {message}</div>
    </div>
  );
}
