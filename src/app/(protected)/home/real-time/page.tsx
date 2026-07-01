"use client";
import { useSSE } from "@/hooks/useSSE";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "../../../components/ConnectionStatus";

type ConnectionEvent = {
  type: "new-connection" | "disconnection";
  clientId: string;
  timestamp: string;
};

export default function RealTimePage() {
  const { clientId, status, connectionInfo, addHandler, removeHandler } =
    useSSE({
      autoConnect: true,
      path: "/socket.io",
      url: typeof window !== "undefined" ? window.location.origin : undefined,
      heartbeatInterval: 1000,
    });

  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  useEffect(() => {
    const handleConnectionUpdate = (data: any) => {
      if (typeof data?.totalConnections === "number") {
        // Keep the Active Connections fast-updating
        // connectionInfo is already updated inside hook, but this ensures immediate UI reflection in this page
      }
      setEvents((prev) => [
        {
          type: data.type,
          clientId: data.clientId,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    };

    const handleMessage = (data: any) => {
      setMessages((prev) => [data, ...prev.slice(0, 9)]);
    };

    const handlePresence = (data: any) => {
      if (Array.isArray(data?.activeIds)) {
        setActiveIds(data.activeIds);
      }
    };

    addHandler("connection-update", handleConnectionUpdate);
    addHandler("message", handleMessage);
    addHandler("presence", handlePresence);

    return () => {
      removeHandler("connection-update");
      removeHandler("message");
      removeHandler("presence");
    };
  }, [addHandler, removeHandler]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Real-Time Monitoring</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Connection Info Card */}
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Your Connection</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Status:</span>
              <span
                className={`ml-2 rounded px-2 py-1 text-xs ${
                  status === "connected"
                    ? "bg-green-100 text-green-800"
                    : status === "connecting"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {status.toUpperCase()}
              </span>
            </p>
            <p>
              <span className="font-medium">Your ID:</span> {clientId || "N/A"}
            </p>
            <p>
              <span className="font-medium">Active Connections:</span>{" "}
              {connectionInfo.totalConnections}
            </p>
            <p>
              <span className="font-medium">Active Now:</span>{" "}
              {activeIds.length}
            </p>
          </div>
        </div>

        {/* Connection Events Card */}
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Connection Events</h2>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No events yet</p>
            ) : (
              events.map((event, i) => (
                <div key={i} className="border-b p-2 text-sm">
                  <p
                    className={`font-medium ${
                      event.type === "new-connection"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {event.type === "new-connection"
                      ? "Connected"
                      : "Disconnected"}
                    : {event.clientId}
                  </p>
                  <p className="text-xs text-gray-500">{event.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Card */}
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Recent Messages</h2>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="border-b p-2 text-sm">
                  <p className="font-medium">{msg.type}</p>
                  <p className="text-xs">{JSON.stringify(msg.data)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Presence Card */}
        <div className="rounded-lg bg-white p-4 shadow md:col-span-3">
          <h2 className="mb-3 text-lg font-semibold">Active IDs (1s window)</h2>
          {activeIds.length === 0 ? (
            <p className="text-sm text-gray-500">No active sockets</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeIds.map((id) => (
                <span
                  key={id}
                  className="rounded border border-green-200 bg-green-100 px-2 py-1 text-xs text-green-800"
                >
                  {id}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConnectionStatus />
    </div>
  );
}
