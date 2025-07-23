"use client";

import { useState } from "react";
import { useSSE } from "@/features/sse";

interface ClientDemo {
  id: string;
  userId: string;
  name: string;
}

/**
 * Demo component showing multiple SSE clients receiving notifications
 */
export function MultiClientSSEDemo() {
  const [clients, setClients] = useState<ClientDemo[]>([
    { id: "client1", userId: "user-alice", name: "Alice" },
    { id: "client2", userId: "user-bob", name: "Bob" },
    { id: "client3", userId: "demo-user-123", name: "Demo User" },
  ]);

  const [broadcastMessage, setBroadcastMessage] = useState("Hello everyone!");
  const [targetUserId, setTargetUserId] = useState("user-alice");
  const [targetMessage, setTargetMessage] = useState("Personal message");

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold">Multi-Client SSE Demo</h1>
        <p className="mb-6 text-gray-600">
          This demonstrates how notifications are received by multiple clients
          in real-time. Each client below represents a different user or
          session.
        </p>

        {/* Control Panel */}
        <div className="mb-6 space-y-4 rounded-lg bg-gray-50 p-4">
          <h3 className="text-lg font-semibold">Send Notifications</h3>

          {/* Broadcast to All */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Broadcast message..."
              className="flex-1 rounded-md border px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={() => sendBroadcast(broadcastMessage)}
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Broadcast to All
            </button>
          </div>

          {/* Send to Specific User */}
          <div className="flex items-center gap-2">
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="rounded-md border px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.userId}>
                  {client.name} ({client.userId})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={targetMessage}
              onChange={(e) => setTargetMessage(e.target.value)}
              placeholder="Personal message..."
              className="flex-1 rounded-md border px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
            />
            <button
              onClick={() => sendToUser(targetUserId, targetMessage)}
              className="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
            >
              Send to User
            </button>
          </div>
        </div>

        {/* Client Connections */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      </div>
    </div>
  );

  async function sendBroadcast(message: string) {
    try {
      await fetch("/api/sse/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "broadcast",
          data: {
            message: `Broadcast: ${message}`,
            timestamp: new Date().toISOString(),
            sender: "multi-client-demo",
          },
          broadcast: true, // This was missing!
        }),
      });
    } catch (error) {
      console.error("Error sending broadcast:", error);
    }
  }

  async function sendToUser(userId: string, message: string) {
    try {
      await fetch("/api/sse/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "notification",
          data: {
            message: `Personal: ${message}`,
            timestamp: new Date().toISOString(),
            sender: "multi-client-demo",
          },
          userId,
        }),
      });
    } catch (error) {
      console.error("Error sending personal message:", error);
    }
  }
}

interface ClientCardProps {
  client: ClientDemo;
}

function ClientCard({ client }: ClientCardProps) {
  const { connectionState, events, error, connect, disconnect } = useSSE({
    userId: client.userId,
    autoReconnect: false,
    onConnect: () => console.log(`${client.name} connected`),
    onDisconnect: () => console.log(`${client.name} disconnected`),
    onError: (err) => console.error(`${client.name} error:`, err),
  });

  const getStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "connecting":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const recentEvents = events.slice(-5).reverse(); // Show last 5 events

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{client.name}</h3>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor()}`}
        >
          {connectionState}
        </span>
      </div>

      <div className="mb-3 text-sm text-gray-600">
        User ID:{" "}
        <code className="rounded bg-gray-100 px-1">{client.userId}</code>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          onClick={connect}
          disabled={
            connectionState === "connected" || connectionState === "connecting"
          }
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Connect
        </button>
        <button
          onClick={disconnect}
          disabled={connectionState === "disconnected"}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded bg-red-100 p-2 text-xs text-red-700">
          Error: {error.toString()}
        </div>
      )}

      <div className="border-t pt-3">
        <h4 className="mb-2 text-sm font-medium">
          Recent Events ({events.length})
        </h4>
        <div className="max-h-32 space-y-1 overflow-y-auto">
          {recentEvents.length === 0 ? (
            <div className="text-xs text-gray-500 italic">No events yet</div>
          ) : (
            recentEvents.map((event, index) => (
              <div key={index} className="rounded bg-gray-50 p-2 text-xs">
                <div className="font-medium text-purple-600">{event.type}</div>
                <div className="mt-1 text-gray-700">
                  {event.data
                    ? JSON.stringify(JSON.parse(event.data), null, 2)
                    : "No data"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
