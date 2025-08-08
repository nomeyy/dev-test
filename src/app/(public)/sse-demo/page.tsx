"use client";

import { useState, useEffect, useRef } from "react";

export default function SSEDemoPage() {
  const [userId] = useState("demo-user-123");
  const [sessionId] = useState("demo-session-456");
  const [messages, setMessages] = useState<
    Array<{ id: string; event: string; data: any; timestamp: Date }>
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const addMessage = (event: string, data: any) => {
      console.log("Adding message to UI:", event, data);
      setMessages((prev) => [
        {
          id: Date.now().toString(),
          event,
          data,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9), // Keep only last 10 messages
      ]);
    };

    try {
      console.log("SSE: Attempting to connect...");

      // Connect without user/session targeting to receive all broadcast events
      const url = `/api/sse`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("SSE: Connection opened successfully");
        setIsConnected(true);
        setError(undefined);
      };

      // Listen for specific event types
      eventSource.addEventListener("notification", (event) => {
        try {
          console.log("SSE: Received notification event", event);
          const data = JSON.parse(event.data);
          addMessage("notification", data);
        } catch (error) {
          console.error("SSE: Error parsing notification:", error);
        }
      });

      eventSource.addEventListener("update", (event) => {
        try {
          console.log("SSE: Received update event", event);
          const data = JSON.parse(event.data);
          addMessage("update", data);
        } catch (error) {
          console.error("SSE: Error parsing update:", error);
        }
      });

      eventSource.addEventListener("alert", (event) => {
        try {
          console.log("SSE: Received alert event", event);
          const data = JSON.parse(event.data);
          addMessage("alert", data);
        } catch (error) {
          console.error("SSE: Error parsing alert:", error);
        }
      });

      eventSource.addEventListener("broadcast", (event) => {
        try {
          console.log("SSE: Received broadcast event", event);
          const data = JSON.parse(event.data);
          addMessage("broadcast", data);
        } catch (error) {
          console.error("SSE: Error parsing broadcast:", error);
        }
      });

      eventSource.addEventListener("connected", (event) => {
        try {
          console.log("SSE: Received connected event", event);
          const data = JSON.parse(event.data);
          if (data?.clientId) {
            setClientId(data.clientId);
            console.log("Connected with client ID:", data.clientId);
          }
        } catch (error) {
          console.error("SSE: Error parsing connected:", error);
        }
      });

      // Fallback for any other events
      eventSource.onmessage = (event) => {
        try {
          console.log("SSE: Received generic message", event);
          const data = JSON.parse(event.data);
          addMessage(event.type || "message", data);
        } catch (error) {
          console.error("SSE: Error parsing message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE: Connection error:", error);
        setIsConnected(false);
        setError("Connection error");
      };

      eventSourceRef.current = eventSource;

      return () => {
        console.log("SSE: Cleaning up connection");
        eventSource.close();
      };
    } catch (error) {
      console.error("SSE: Error creating connection:", error);
      setError("Failed to create connection");
    }
  }, []);

  const sendTestEvent = async (eventType: string) => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventType,
          data: {
            message: `Test ${eventType} event`,
            timestamp: new Date().toISOString(),
            userId,
            sessionId,
          },
          broadcast: true, // Send as broadcast so the UI can receive it
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test event");
      }

      console.log(`Test event "${eventType}" sent successfully`);
    } catch (error) {
      console.error("Error sending test event:", error);
    }
  };

  const sendBroadcastEvent = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "broadcast",
          data: {
            message: "This is a broadcast message to all connected clients!",
            timestamp: new Date().toISOString(),
          },
          broadcast: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send broadcast event");
      }

      console.log("Broadcast event sent successfully");
    } catch (error) {
      console.error("Error sending broadcast event:", error);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">SSE Demo</h1>

      {/* Connection Status */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span>
            <span
              className={`ml-2 rounded px-2 py-1 text-xs ${
                isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div>
            <span className="font-medium">Client ID:</span>
            <span className="ml-2 font-mono text-xs">{clientId || "N/A"}</span>
          </div>
          <div>
            <span className="font-medium">User ID:</span>
            <span className="ml-2 font-mono text-xs">{userId}</span>
          </div>
          <div>
            <span className="font-medium">Session ID:</span>
            <span className="ml-2 font-mono text-xs">{sessionId}</span>
          </div>
          {error && (
            <div className="col-span-2">
              <span className="font-medium text-red-600">Error:</span>
              <span className="ml-2 text-red-600">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Test Controls</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <button
            onClick={() => sendTestEvent("notification")}
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Send Notification
          </button>
          <button
            onClick={() => sendTestEvent("update")}
            className="rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
          >
            Send Update
          </button>
          <button
            onClick={() => sendTestEvent("alert")}
            className="rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600"
          >
            Send Alert
          </button>
          <button
            onClick={sendBroadcastEvent}
            className="rounded bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600"
          >
            Broadcast Message
          </button>
        </div>
      </div>

      {/* Message History */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">
          Message History ({messages.length} messages)
        </h2>
        {messages.length === 0 ? (
          <p className="text-gray-500">
            No messages received yet. Try clicking the buttons above to send
            test events!
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded border p-3">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-sm font-medium">{message.event}</span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className="overflow-x-auto rounded bg-black p-2 text-xs">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
