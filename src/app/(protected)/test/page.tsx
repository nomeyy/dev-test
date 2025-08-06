"use client";

import { useState } from "react";
import { SSEClient } from "../home/components/SSEClient";

export default function TestPage() {
  const [userId] = useState("123"); // Hardcoded for test
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    await fetch("/api/sse/trigger", {
      method: "POST",
      body: JSON.stringify({ userId, message: input }),
      headers: { "Content-Type": "application/json" },
    });
  };

  return (
    <div>
      <SSEClient userId={userId} />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Message"
      />
      <button onClick={sendMessage}>Trigger New Event</button>
    </div>
  );
}
