"use client";

import { useEffect, useState } from "react";

type SSEClientProps = {
  userId: string;
};

export function SSEClient({ userId }: SSEClientProps) {
  const [message, setMessage] = useState<string>("(No messages yet)");

  useEffect(() => {
    const evtSource = new EventSource(`/api/sse?id=${userId}`);

    const onNotification = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setMessage(JSON.stringify(data));
      } catch {
        setMessage(e.data);
      }
    };

    evtSource.addEventListener("notification", onNotification);

    // Optional: handle other events, e.g., ping
    evtSource.addEventListener("ping", () => {
      console.log("ping");
    });

    return () => {
      evtSource.removeEventListener("notification", onNotification);
      evtSource.close();
    };
  }, [userId]);

  return (
    <div style={{ marginTop: 16 }}>
      <div>
        <strong>Latest SSE message:</strong>
      </div>
      <div
        style={{
          padding: 8,
          border: "1px solid #ccc",
          borderRadius: 4,
          marginBottom: 8,
          minHeight: 24,
        }}
        data-testid="sse-message"
      >
        {message}
      </div>
      <button onClick={() => setMessage("(No messages yet)")}>Clear</button>
    </div>
  );
}
