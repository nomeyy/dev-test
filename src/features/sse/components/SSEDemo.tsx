"use client";

import { useState } from "react";
import { useSSE } from "../hooks/useSSE";
import type { SSEEvent } from "../types";

export function SSEDemo() {
  const [messages, setMessages] = useState<SSEEvent[]>([]);
  const [testMessage, setTestMessage] = useState("Hello from SSE!");
  const [sentMessages, setSentMessages] = useState<
    Array<{ event: string; data: Record<string, unknown>; timestamp: string }>
  >([]);
  const [sendStatus, setSendStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { isConnected, lastMessage, error, connect, disconnect } = useSSE({
    url: "/api/sse",
    onMessage: (event) => {
      setMessages((prev) => [...prev, event]);
    },
    onConnect: () => {},
    onDisconnect: () => {},
  });

  const sendTestMessage = async () => {
    try {
      const messageData = {
        message: testMessage,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test-message",
          data: messageData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = (await response.json()) as Record<string, unknown>;

      setSentMessages((prev) => [
        ...prev,
        {
          event: "test-message",
          data: messageData,
          timestamp: new Date().toISOString(),
        },
      ]);

      setSendStatus({ type: "success", message: "Message sent successfully!" });
      setTimeout(() => setSendStatus(null), 3000);
    } catch (error) {
      console.error("Error sending message:", error);
      setSendStatus({ type: "error", message: "Failed to send message" });
      setTimeout(() => setSendStatus(null), 3000);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setSentMessages([]);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-bold">SSE Demo</h2>

        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <div
              className={`h-3 w-3 rounded-full text-[black] ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="font-medium text-[black]">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
            {error && (
              <span className="text-sm text-red-500">Error: {error}</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={connect}
              disabled={isConnected}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Connect
            </button>
            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">Send Test Message</h3>

          {sendStatus && (
            <div
              className={`mb-3 rounded p-2 text-sm ${
                sendStatus.type === "success"
                  ? "border border-green-200 bg-green-100 text-green-800"
                  : "border border-red-200 bg-red-100 text-red-800"
              }`}
            >
              {sendStatus.message}
            </div>
          )}
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-[black] focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter test message..."
            />
            <button
              onClick={sendTestMessage}
              disabled={!isConnected}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Send
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Message History</h3>
            <button
              onClick={clearMessages}
              className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
            >
              Clear All
            </button>
          </div>

          <div>
            <h4 className="mb-2 font-medium text-gray-700">
              Sent Messages ({sentMessages.length})
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {sentMessages.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-500">
                  No messages sent yet
                </p>
              ) : (
                sentMessages.map((message, index) => (
                  <div
                    key={`sent-${index}`}
                    className="rounded border-l-4 border-green-500 bg-green-50 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600">
                        Sent: {message.event}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800">
                      {message.event === "test-message" && (
                        <div>
                          <strong>Message:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.message as string}
                          </span>
                        </div>
                      )}
                      {message.event === "notification" && (
                        <div>
                          <strong>Title:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.title as string}
                          </span>
                          <br />
                          <strong>Message:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.message as string}
                          </span>
                          <br />
                          <strong>Type:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.type as string}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-medium text-gray-700">
              Received Messages ({messages.length})
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-500">
                  No messages received yet
                </p>
              ) : (
                [...messages].reverse().map((message, index) => (
                  <div
                    key={`received-${index}`}
                    className="rounded border-l-4 border-blue-500 bg-blue-50 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-600">
                        Received: {message.event}
                      </span>
                      {message.id && (
                        <span className="text-xs text-gray-500">
                          ID: {message.id ?? "N/A"}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-800">
                      {message.event === "test-message" && (
                        <div>
                          <strong>Message:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.message as string}
                          </span>
                        </div>
                      )}
                      {message.event === "notification" && (
                        <div>
                          <strong>Title:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.title as string}
                          </span>
                          <br />
                          <strong>Message:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.message as string}
                          </span>
                          <br />
                          <strong>Type:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.type as string}
                          </span>
                        </div>
                      )}
                      {message.event === "ping" && (
                        <div>
                          <strong>Ping:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.timestamp as string}
                          </span>
                        </div>
                      )}
                      {message.event === "connected" && (
                        <div>
                          <strong>Connected:</strong>{" "}
                          <span className="rounded bg-gray-100 px-1 font-mono">
                            {message.data.message as string}
                          </span>
                        </div>
                      )}
                      {![
                        "test-message",
                        "notification",
                        "ping",
                        "connected",
                      ].includes(message.event) && (
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {lastMessage && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-blue-800">Latest Message</h3>
            <div className="text-sm text-blue-700">
              <div className="mb-1">
                <strong>Event:</strong> {lastMessage.event}
              </div>
              <div className="mb-1">
                <strong>ID:</strong> {lastMessage.id || "N/A"}
              </div>
              <div>
                <strong>Data:</strong>
                <pre className="mt-1 text-xs whitespace-pre-wrap">
                  {JSON.stringify(lastMessage.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
