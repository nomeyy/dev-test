"use client";

import React, { useState } from "react";
import { useSSE } from "@/features/sse";

interface SSEMessage {
  event: string;
  data: unknown;
  timestamp: string;
}

export default function SSEDemoPage() {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [eventToSend, setEventToSend] = useState("test-notification");
  const [dataToSend, setDataToSend] = useState(
    '{"message": "Hello from SSE!", "count": 1}',
  );
  const [isSending, setIsSending] = useState(false);

  // Create a single SSE connection with all event handlers
  const sse = useSSE({
    url: "/api/sse",
    autoConnect: true,
    debug: true,
  });

  // Set up all event listeners once when SSE is available
  React.useEffect(() => {
    if (!sse?.addEventListener) return;

    console.log("SSE Demo: Setting up event listeners");

    // Create stable handler functions using refs to avoid recreating them
    const handleTestNotification = (data: unknown) => {
      console.log("SSE Demo: Received test-notification:", data);
      const newMessage: SSEMessage = {
        event: "test-notification",
        data,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [newMessage, ...prev].slice(0, 50));
    };

    const handleHeartbeat = (data: unknown) => {
      const newMessage: SSEMessage = {
        event: "heartbeat",
        data,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [newMessage, ...prev].slice(0, 50));
    };

    const handleConnection = (data: unknown) => {
      console.log("SSE Demo: Received connection event:", data);
      const newMessage: SSEMessage = {
        event: "connection",
        data,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [newMessage, ...prev].slice(0, 50));
    };

    // Add listeners
    sse.addEventListener("test-notification", handleTestNotification);
    sse.addEventListener("heartbeat", handleHeartbeat);
    sse.addEventListener("connection", handleConnection);

    console.log("SSE Demo: Event listeners added");

    // Cleanup function
    return () => {
      console.log("SSE Demo: Cleaning up event listeners");
      sse.removeEventListener("test-notification", handleTestNotification);
      sse.removeEventListener("heartbeat", handleHeartbeat);
      sse.removeEventListener("connection", handleConnection);
    };
  }, [sse]); // Only depend on SSE instance

  const sendNotification = async () => {
    setIsSending(true);
    try {
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(dataToSend);
      } catch {
        parsedData = dataToSend;
      }

      console.log("SSE Demo: Sending notification:", {
        event: eventToSend,
        data: parsedData,
      });

      const response = await fetch("/api/sse/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventToSend,
          data: parsedData,
          broadcast: false, // Send to current user only
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send notification");
      }

      const result = (await response.json()) as {
        success: boolean;
        sentCount: number;
      };
      console.log("Notification sent:", result);

      if (result.sentCount === 0) {
        console.warn(
          "⚠️ Notification was sent but no clients received it. Check user ID match.",
        );
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification");
    } finally {
      setIsSending(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const formatData = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          SSE (Server-Sent Events) Demo
        </h1>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
          <div className="flex items-center space-x-4">
            <div
              className={`h-3 w-3 rounded-full ${sse.isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span
              className={sse.isConnected ? "text-green-700" : "text-red-700"}
            >
              {sse.isConnected ? "Connected" : "Disconnected"}
            </span>
            {sse.isConnecting && (
              <span className="text-yellow-600">Connecting...</span>
            )}
            {sse.error && (
              <span className="text-red-600">Error: {sse.error.message}</span>
            )}
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => void sse.connect()}
              disabled={sse.isConnected || sse.isConnecting}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              Connect
            </button>
            <button
              onClick={sse.disconnect}
              disabled={!sse.isConnected}
              className="rounded bg-red-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Send Notification */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Send Notification</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="event"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Event Type
              </label>
              <input
                id="event"
                type="text"
                value={eventToSend}
                onChange={(e) => setEventToSend(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                placeholder="test-notification"
              />
            </div>
            <div>
              <label
                htmlFor="data"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Data (JSON or text)
              </label>
              <textarea
                id="data"
                value={dataToSend}
                onChange={(e) => setDataToSend(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                placeholder='{"message": "Hello from SSE!", "count": 1}'
              />
            </div>
            <button
              onClick={() => void sendNotification()}
              disabled={isSending || !sse.isConnected}
              className="rounded bg-green-600 px-6 py-2 text-white disabled:bg-gray-400"
            >
              {isSending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">
              Received Messages ({messages.length})
            </h2>
            <button
              onClick={clearMessages}
              className="rounded bg-gray-600 px-4 py-2 text-sm text-white"
            >
              Clear Messages
            </button>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 italic">
                No messages received yet. Connect and send a notification to see
                events here.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className={`rounded border-l-4 border-gray-400 bg-gray-50 p-3`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Event: {message.event}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="overflow-x-auto text-sm whitespace-pre-wrap text-gray-600">
                    {formatData(message.data)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-blue-900">
            How to Use
          </h3>
          <ol className="list-inside list-decimal space-y-1 text-blue-800">
            <li>Click &quot;Connect&quot; to establish an SSE connection</li>
            <li>
              You should see a &quot;connection&quot; event and periodic
              &quot;heartbeat&quot; events
            </li>
            <li>
              Use &quot;Send Notification&quot; to test client-to-server
              communication (for demo only)
            </li>
            <li>
              The notification will be sent to your current session and appear
              in the messages
            </li>
            <li>
              Open this page in multiple tabs to test multi-client messaging
            </li>
          </ol>
        </div>

        {/* Server-Side Usage */}
        <div className="mt-6 rounded-lg bg-green-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-green-900">
            Real Server-Side Usage
          </h3>
          <p className="mb-3 text-green-800">
            In production, SSE notifications should be sent from server-side
            code, not from the client:
          </p>
          <div className="rounded bg-white p-4 font-mono text-sm">
            <div className="mb-2 text-green-700">
              {/* In your webhook handler, job processor, etc. */}
            </div>
            <div className="text-gray-800">
              <div>
                import &#123; getSSEManager &#125; from
                &apos;@/features/sse&apos;;
              </div>
              <div className="mt-2">const manager = getSSEManager();</div>
              <div className="mt-1">manager.sendToUser(userId, &#123;</div>
              <div className="ml-4">event: &apos;order-status&apos;,</div>
              <div className="ml-4">
                data: &#123; orderId: &apos;123&apos;, status:
                &apos;shipped&apos; &#125;
              </div>
              <div>&#125;);</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
