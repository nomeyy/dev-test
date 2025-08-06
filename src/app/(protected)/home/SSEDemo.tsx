"use client";

import { useState, useEffect } from "react";
import { TrackConnections, useSSE, type SSEEvent } from "@/features/sse";

export default function SSEDemo({ userId }: { userId: string }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [messageInput, setMessageInput] = useState("Test notification Message");
  const [messages, setMessages] = useState<string[]>([]);
  const { isConnected, lastEvent, addEventListener } = useSSE({
    userId,
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  useEffect(() => {
    const unsubscribe = addEventListener("notification", (event: SSEEvent) => {
      setMessages((prev) => [
        ...prev,
        JSON.stringify({ message: event.data, userId }, null, 2),
      ]);
    });
    return unsubscribe;
  }, [addEventListener, userId]);

  const sendNotification = async () => {
    if (!targetUserId.trim()) {
      alert("Please enter a target user ID");
      return;
    }
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId, message: messageInput }),
      });
      if (!response.ok) throw new Error("Failed to send notification");
      setMessageInput("");
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification");
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-white/10 p-4 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-white">SSE Notifications</h2>
      <p className="mb-2 text-white">
        Status: {isConnected ? "Connected" : "Disconnected"}
      </p>
      <p className="mb-4 text-white">Your User ID: {userId}</p>
      <div className="mb-4">
        <input
          type="text"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Enter target user ID"
          className="w-full rounded border bg-gray-800 p-2 text-white"
        />
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Enter message"
          className="w-full rounded border bg-gray-800 p-2 text-white"
        />
      </div>
      <button
        onClick={sendNotification}
        className="w-full rounded bg-blue-500 p-2 text-white transition hover:bg-blue-600"
        disabled={!isConnected}
      >
        Send Notification
      </button>
      <h3 className="mt-4 mb-2 text-lg font-semibold text-white">
        Received Notifications
      </h3>
      <div className="max-h-60 overflow-y-auto rounded bg-white/5 p-2">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <pre key={index} className="mb-2 text-sm text-white">
              {msg}
            </pre>
          ))
        ) : (
          <p className="text-white/70">No notifications received</p>
        )}
      </div>
      <TrackConnections />
    </div>
  );
}
