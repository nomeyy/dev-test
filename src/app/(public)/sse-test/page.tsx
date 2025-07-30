"use client";

import { useState, useEffect } from "react";

/**
 * Simple test page to verify SSE functionality
 * Shows connection status and displays received messages
 */
export default function SSETestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [userId, setUserId] = useState<string>("user_123");
  const [sessionId, setSessionId] = useState<string>("session_456");
  const [clientId, setClientId] = useState<string>("");
  const [connectionStats, setConnectionStats] = useState<any>(null);
  const [sendMessage, setSendMessage] = useState<string>("");
  const [sendTarget, setSendTarget] = useState<string>("user");
  const [sendTargetId, setSendTargetId] = useState<string>("");

  const connectToSSE = () => {
    if (eventSource) {
      eventSource.close();
    }

    setConnectionStatus("connecting");
    setMessages([]);
    setClientId("");
    setConnectionStats(null);

    // Build URL with user and session parameters
    const params = new URLSearchParams();
    if (userId.trim()) params.append("userId", userId.trim());
    if (sessionId.trim()) params.append("sessionId", sessionId.trim());

    const sseUrl = `/api/sse${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("Connecting to:", sseUrl);

    const newEventSource = new EventSource(sseUrl);

    newEventSource.onopen = () => {
      console.log("SSE: Connection opened");
      setConnectionStatus("connected");
      setMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Connected to SSE stream`,
      ]);
    };

    newEventSource.onmessage = (event) => {
      console.log("SSE: Message received:", event.data);
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        if (data.type === "connection" && data.data.clientId) {
          setClientId(data.data.clientId);
        }

        if (data.type === "stats" && data.data.stats) {
          setConnectionStats(data.data.stats);
        }

        // Format message based on type
        let messageText = "";
        if (data.data && typeof data.data === "object") {
          if (data.data.message) {
            messageText = `${data.type}: ${data.data.message}`;
          } else {
            messageText = `${data.type}: ${JSON.stringify(data.data)}`;
          }
        } else {
          messageText = `${data.type}: ${data.data || "No data"}`;
        }

        setMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${messageText}`,
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Raw: ${event.data}`,
        ]);
      }
    };

    newEventSource.onerror = (error) => {
      console.error("SSE: Error occurred:", error);
      setConnectionStatus("disconnected");
      setMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error: Connection failed`,
      ]);
    };

    setEventSource(newEventSource);
  };

  const disconnectFromSSE = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setConnectionStatus("disconnected");
  };

  const sendTestMessage = async () => {
    if (!sendMessage.trim()) {
      alert("Please enter a message to send");
      return;
    }

    try {
      const payload = {
        target: sendTarget,
        targetId:
          sendTarget === "broadcast"
            ? undefined
            : sendTargetId.trim() ||
              (sendTarget === "user" ? userId : sessionId),
        message: sendMessage.trim(),
        type: "test_message",
      };

      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Message sent successfully! Delivered to ${result.sentCount} client(s)`,
        );
        setSendMessage("");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Check console for details.");
    }
  };

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "disconnected":
        return "text-red-600";
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">SSE Test Page</h1>

      <div className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-lg">Status:</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {connectionStatus.toUpperCase()}
          </span>
          {clientId && (
            <span className="text-sm text-gray-500">Client ID: {clientId}</span>
          )}
        </div>

        {/* Connection Parameters */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              User ID (optional)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={connectionStatus === "connected"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              placeholder="e.g., user_123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Session ID (optional)
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={connectionStatus === "connected"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              placeholder="e.g., session_456"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={connectToSSE}
            disabled={connectionStatus === "connecting"}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {connectionStatus === "connecting"
              ? "Connecting..."
              : "Connect to SSE"}
          </button>

          <button
            onClick={disconnectFromSSE}
            disabled={connectionStatus === "disconnected"}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Message Sending Controls */}
      <div className="mb-6 rounded-lg border bg-green-50 p-4">
        <h2 className="mb-3 text-lg font-semibold text-green-800">
          Send Test Messages
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-green-700">
              Target Type
            </label>
            <select
              value={sendTarget}
              onChange={(e) => {
                setSendTarget(e.target.value);
                // Auto-fill targetId based on selection
                if (e.target.value === "user") {
                  setSendTargetId(userId);
                } else if (e.target.value === "session") {
                  setSendTargetId(sessionId);
                } else if (e.target.value === "client") {
                  setSendTargetId(clientId);
                } else {
                  setSendTargetId("");
                }
              }}
              className="mt-1 block w-full rounded-md border border-green-300 px-3 py-2 text-sm text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
            >
              <option value="user">To User</option>
              <option value="session">To Session</option>
              <option value="client">To Specific Client</option>
              <option value="broadcast">Broadcast to All</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-green-700">
              Target ID {sendTarget === "broadcast" ? "(not needed)" : ""}
            </label>
            <input
              type="text"
              value={sendTargetId}
              onChange={(e) => setSendTargetId(e.target.value)}
              disabled={sendTarget === "broadcast"}
              className="mt-1 block w-full rounded-md border border-green-300 px-3 py-2 text-sm text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
              placeholder={
                sendTarget === "user"
                  ? "User ID"
                  : sendTarget === "session"
                    ? "Session ID"
                    : sendTarget === "client"
                      ? "Client ID"
                      : ""
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-700">
              Message
            </label>
            <input
              type="text"
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              className="mt-1 block w-full rounded-md border border-green-300 px-3 py-2 text-sm text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
              placeholder="Enter your test message"
              onKeyPress={(e) => e.key === "Enter" && sendTestMessage()}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={sendTestMessage}
            disabled={!sendMessage.trim()}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
          >
            Send Message
          </button>
        </div>
      </div>

      {/* Connection Statistics */}
      {connectionStats && (
        <div className="mb-6 rounded-lg border bg-blue-50 p-4">
          <h2 className="mb-3 text-lg font-semibold text-blue-800">
            Connection Statistics
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="font-medium text-blue-700">Total Clients:</span>
              <span className="ml-2 text-blue-900">
                {connectionStats.totalClients}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Total Users:</span>
              <span className="ml-2 text-blue-900">
                {connectionStats.totalUsers}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Total Sessions:</span>
              <span className="ml-2 text-blue-900">
                {connectionStats.totalSessions}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-gray-50 p-4">
        <h2 className="mb-4 text-xl font-semibold text-gray-600 shadow-sm">
          Messages ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <p className="text-gray-500 italic">
            No messages received yet. Click "Connect to SSE" to start.
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className="rounded border bg-white p-2 font-mono text-sm text-gray-600 shadow-sm"
              >
                {message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>
          <strong>How to test connection tracking and messaging:</strong>
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Enter optional User ID and Session ID before connecting</li>
          <li>Click "Connect to SSE" to establish connection</li>
          <li>You should see connection confirmation with client ID</li>
          <li>Connection statistics will show after 1 second</li>
          <li>A test message will arrive after 3 seconds</li>
          <li>
            <strong>
              Use "Send Test Messages" section to test targeted messaging:
            </strong>
            <ul className="mt-1 ml-4 list-inside list-disc space-y-1">
              <li>Send to specific user (will reach all their clients)</li>
              <li>
                Send to specific session (will reach all clients in that
                session)
              </li>
              <li>Send to specific client ID (will reach only that client)</li>
              <li>Broadcast to all connected clients</li>
            </ul>
          </li>
          <li>
            Open multiple browser tabs with different User/Session IDs to test
            multi-client scenarios
          </li>
          <li>Check browser dev tools Network tab to see the SSE stream</li>
          <li>Click "Disconnect" to close the connection</li>
        </ol>
      </div>
    </div>
  );
}
