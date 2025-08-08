"use client";

import { useEffect, useState } from "react";

export default function SSETestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const addMessage = (message: string) => {
      setMessages((prev) => [message, ...prev.slice(0, 9)]);
    };

    try {
      addMessage("Attempting to connect to SSE...");

      const eventSource = new EventSource(
        "/api/sse?userId=test&sessionId=test",
      );

      eventSource.onopen = () => {
        addMessage("✅ Connection opened successfully");
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        addMessage(`📨 Received: ${event.data}`);
      };

      eventSource.onerror = (error) => {
        addMessage(`❌ Connection error: ${error.type}`);
        setIsConnected(false);
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      addMessage(`❌ Failed to create connection: ${error}`);
    }
  }, []);

  const sendTestEvent = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test",
          data: { message: "Test message from browser" },
          broadcast: true,
        }),
      });

      if (response.ok) {
        setMessages((prev) => [
          "✅ Test event sent successfully",
          ...prev.slice(0, 9),
        ]);
      } else {
        setMessages((prev) => [
          "❌ Failed to send test event",
          ...prev.slice(0, 9),
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        `❌ Error sending test event: ${error}`,
        ...prev.slice(0, 9),
      ]);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">SSE Simple Test</h1>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
        <div className="flex items-center gap-4">
          <span className="font-medium">Status:</span>
          <span
            className={`rounded px-2 py-1 text-xs ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Test Controls</h2>
        <button
          onClick={sendTestEvent}
          className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          Send Test Event
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Messages</h2>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="rounded bg-gray-50 p-2 text-sm">
                {message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
