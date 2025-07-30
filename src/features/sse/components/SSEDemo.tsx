"use client";

import { useState, useEffect } from "react";
import { Button } from "../../shared/components/ui/button";

interface SSEMessage {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
}

export function SSEDemo() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = () => {
    if (eventSource) {
      eventSource.close();
    }

    const newEventSource = new EventSource("/api/sse");

    newEventSource.onopen = () => {
      setIsConnected(true);
      setLatestMessage("Connected to SSE stream");
    };

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          id: event.lastEventId || Date.now().toString(),
          event: "message",
          data,
          timestamp: new Date(),
        };

        setMessages((prev) => [message, ...prev.slice(0, 9)]); // Keep last 10 messages
        setLatestMessage(`Message: ${JSON.stringify(data)}`);
      } catch (error) {
        setLatestMessage(`Raw message: ${event.data}`);
      }
    };

    newEventSource.addEventListener("heartbeat", (event) => {
      setLatestMessage("Heartbeat received");
    });

    newEventSource.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          id: event.lastEventId || Date.now().toString(),
          event: "notification",
          data,
          timestamp: new Date(),
        };

        setMessages((prev) => [message, ...prev.slice(0, 9)]);
        setLatestMessage(
          `Notification: ${data.message || JSON.stringify(data)}`,
        );
      } catch (error) {
        setLatestMessage(`Notification: ${event.data}`);
      }
    });

    newEventSource.onerror = (error) => {
      setIsConnected(false);
      setLatestMessage("Connection error occurred");
      console.error("SSE Error:", error);
    };

    setEventSource(newEventSource);
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
      setLatestMessage("Disconnected from SSE stream");
    }
  };

  const sendTestMessage = async () => {
    try {
      // This would typically be an API call to trigger a server-side event
      // For demo purposes, we'll just show how it would work
      const response = await fetch("/api/test-sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Test message from UI",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        setLatestMessage("Failed to send test message");
      }
    } catch (error) {
      setLatestMessage("Error sending test message");
    }
  };

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h2 className="text-2xl font-bold">SSE Demo</h2>

      <div className="flex gap-2">
        <Button
          onClick={connect}
          disabled={isConnected}
          variant={isConnected ? "secondary" : "default"}
        >
          {isConnected ? "Connected" : "Connect to SSE"}
        </Button>

        <Button onClick={disconnect} disabled={!isConnected} variant="outline">
          Disconnect
        </Button>

        <Button
          onClick={sendTestMessage}
          disabled={!isConnected}
          variant="outline"
        >
          Send Test Message
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium">
            Status: {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="rounded-lg bg-gray-100 p-3">
          <p className="text-sm font-medium">Latest Message:</p>
          <p className="mt-1 text-sm text-gray-700">{latestMessage}</p>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Recent Messages</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={`${message.id}-${index}`}
                className="rounded border-l-4 border-blue-400 bg-blue-50 p-2"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-blue-600">
                    {message.event}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {typeof message.data === "string"
                    ? message.data
                    : JSON.stringify(message.data, null, 2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
