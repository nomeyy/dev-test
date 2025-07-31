"use client";

import { useSession } from "@/features/auth/client";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

type ConnectionStatus = "connecting" | "connected" | "disconnected";
interface ConnectionStats {
  userIds: string[];
  totalUsers: number;
  totalConnections: number;
}

export function SSETest() {
  const session = useSession();
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [eventHistory, setEventHistory] = useState<string[]>([]);

  const sendTestMutation = api.notifications.sendTest.useMutation();
  const broadcastTestMutation = api.notifications.broadcastTest.useMutation();

  useEffect(() => {
    if (!session?.user?.id) return;

    setConnectionStatus("connecting");
    const eventSource = new EventSource("/api/notifications/sse");

    const addLog = (log: string) => {
      setEventHistory((prev) => [
        `${new Date().toLocaleTimeString()} - ${log}`,
        ...prev,
      ]);
    };

    eventSource.addEventListener("connected", () => {
      setConnectionStatus("connected");
    });

    eventSource.addEventListener("test", (event) => {
      const data = JSON.parse(event.data as string) as { message: string };
      setMessages((prev) => [data.message, ...prev]);
    });

    eventSource.addEventListener("system-update", (event) => {
      const { log, stats } = JSON.parse(event.data as string) as {
        log: string;
        stats: ConnectionStats;
      };
      addLog(log);
      setStats(stats);
    });

    eventSource.onerror = () => {
      setConnectionStatus("disconnected");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id]);

  const handleSendTest = () => {
    sendTestMutation.mutate({ message: "This is a test message." });
  };

  const handleBroadcastTest = () => {
    broadcastTestMutation.mutate({
      message: "This is a broadcast to everyone.",
    });
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="mt-8 flex flex-col gap-8 md:flex-row">
      {/* SSE Card */}
      <div
        className="flex flex-col gap-4 rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-200 p-6 shadow-lg"
        style={{ width: 540, minWidth: 540, maxWidth: 540 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-blue-900">
            🔔 Real-Time Notifications
          </h2>
          <Badge
            variant={
              connectionStatus === "connected" ? "default" : "destructive"
            }
            className={`px-3 py-1 text-sm capitalize ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}
          >
            {connectionStatus}
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button
            className="w-[140px] whitespace-nowrap"
            onClick={handleSendTest}
            disabled={
              connectionStatus !== "connected" ||
              sendTestMutation.status === "pending"
            }
          >
            {sendTestMutation.status === "pending" ? (
              <span className="flex items-center gap-1">
                <svg
                  className="mr-1 h-4 w-4 animate-spin text-blue-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Sending...
              </span>
            ) : (
              "Send to Me"
            )}
          </Button>
          <Button
            className="w-[170px] whitespace-nowrap"
            variant="secondary"
            onClick={handleBroadcastTest}
            disabled={
              connectionStatus !== "connected" ||
              broadcastTestMutation.status === "pending"
            }
          >
            {broadcastTestMutation.status === "pending" ? (
              <span className="flex items-center gap-1">
                <svg
                  className="mr-1 h-4 w-4 animate-spin text-blue-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Broadcasting...
              </span>
            ) : (
              "Broadcast to All"
            )}
          </Button>
          <Button
            className="w-[140px] whitespace-nowrap text-gray-800"
            variant="outline"
            onClick={handleClearMessages}
          >
            Clear Messages
          </Button>
        </div>
        <div className="h-[180px] overflow-y-auto rounded-lg border bg-white p-4">
          <h3 className="mb-2 font-semibold text-blue-700">
            Received Messages
          </h3>
          {messages.length === 0 ? (
            <p className="text-gray-400 italic">No messages yet.</p>
          ) : (
            <ul className="space-y-1">
              {messages.map((msg, i) => (
                <li key={i} className="text-blue-900">
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Server Stats & Event Log */}
      <div
        className="flex flex-col gap-4 rounded-2xl border-2 border-gray-400 bg-gradient-to-br from-gray-50 to-gray-200 p-6 shadow-lg"
        style={{ width: 540, minWidth: 540, maxWidth: 540 }}
      >
        <h2 className="mb-2 text-xl font-bold text-gray-900">Server Stats</h2>
        <div className="mb-2 flex gap-6">
          <div>
            <span className="font-semibold text-gray-800">Users:</span>{" "}
            <span className="font-bold text-gray-800">
              {stats?.totalUsers ?? 0}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-800">Connections:</span>{" "}
            <span className="font-bold text-gray-800">
              {stats?.totalConnections ?? 0}
            </span>
          </div>
        </div>
        <h3 className="mt-2 font-semibold text-gray-800">Event Log</h3>
        <div className="h-[120px] overflow-y-auto rounded-lg border bg-white p-3 font-mono text-xs text-gray-800">
          {eventHistory.length === 0 ? (
            <p className="text-gray-400 italic">No events yet.</p>
          ) : (
            eventHistory.map((log, i) => <p key={i}>{log}</p>)
          )}
        </div>
      </div>
    </div>
  );
}
