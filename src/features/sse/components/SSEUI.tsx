"use client";

import { useState } from "react";
import useSSE from "@/hooks/useSSE";
import { useSession } from "next-auth/react";

export default function SSEUI() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "demo-user";
  const [messages, setMessages] = useState<string[]>([]);

  useSSE(userId, {
    onEvent: (name, data) => {
      setMessages((msgs) => [
        `Event: ${name} — ${JSON.stringify(data)}`,
        ...msgs,
      ]);
    },
  });

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <div style={{ marginBottom: "10px" }}>
        <b>User ID:</b> {userId}
      </div>

      <button
        style={{
          border: "2px solid white",
          padding: "16px",
          borderRadius: "30px",
          cursor: "pointer",
        }}
        onClick={async () => {
          await fetch("/api/send-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              event: "message",
              data: {
                time: new Date().toISOString(),
                text: "Hello to ONE user!",
              },
            }),
          });
        }}
      >
        Send Event
      </button>

      <button
        style={{
          marginLeft: 15,
          border: "2px solid white",
          padding: "16px",
          borderRadius: "30px",
          cursor: "pointer",
        }}
        onClick={async () => {
          await fetch("/api/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "message",
              data: {
                time: new Date().toISOString(),
                text: "Hello to EVERYONE!",
              },
            }),
          });
        }}
      >
        Broadcast Event
      </button>

      <div
        style={{
          marginTop: 20,
          maxHeight: 300,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: 10,
        }}
      >
        {messages.length === 0 && <p>No messages yet</p>}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{ fontSize: 12, fontFamily: "monospace", marginBottom: 6 }}
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
