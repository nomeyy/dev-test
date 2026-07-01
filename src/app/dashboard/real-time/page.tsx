"use client";
import { useSSE } from "@/hooks/useSSE";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "../../components/ConnectionStatus";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Home } from "lucide-react";

type ConnectionEvent = {
  type: "new-connection" | "disconnection";
  clientId: string;
  timestamp: string;
};

export default function RealTimePage() {
  const { clientId, status, connectionInfo, addHandler, removeHandler } =
    useSSE();

  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const handleConnectionUpdate = (data: any) => {
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

    addHandler("connection-update", handleConnectionUpdate);
    addHandler("message", handleMessage);

    return () => {
      removeHandler("connection-update");
      removeHandler("message");
    };
  }, [addHandler, removeHandler]);

  return (
    <div className="container mx-auto p-4 text-black">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/home">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Go to Home
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Real-Time Monitoring</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Connection Info Card */}
        <div className="rounded-lg bg-white p-4 text-black shadow">
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
          </div>
        </div>

        {/* Connection Events Card */}
        <div className="rounded-lg bg-white p-4 text-black shadow">
          <h2 className="mb-3 text-lg font-semibold text-black">
            Connection Events
          </h2>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-gray-600">No events yet</p>
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
                  <p className="text-xs text-gray-600">{event.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Card */}
        <div className="rounded-lg bg-white p-4 text-black shadow">
          <h2 className="mb-3 text-lg font-semibold">Recent Messages</h2>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-600">No messages yet</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="border-b p-2 text-sm">
                  <p className="font-medium">{msg.type}</p>
                  <p className="text-xs">{JSON.stringify(msg.data)}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConnectionStatus />
    </div>
  );
}
