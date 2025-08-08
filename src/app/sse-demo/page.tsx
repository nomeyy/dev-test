"use client";

import { useCallback, useState } from "react";
import { useSSE } from "@/hooks/use-sse";
import {
  SSEEventEnum,
  SSETypeEnum,
  type ConnectedEventData,
} from "@/lib/sse/types";

type MessageLog = {
  type: SSETypeEnum;
  event?: SSEEventEnum;
  data: unknown;
  timestamp: number;
};

export default function SSEDemo() {
  const [messages, setMessages] = useState<Array<MessageLog>>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const onConnect = useCallback((data: ConnectedEventData) => {
    setMessages((prev) => [
      ...prev,
      {
        type: SSETypeEnum.system,
        event: SSEEventEnum.connected,
        data: `Connected with ID: ${data.clientId}`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const onDisconnect = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        type: SSETypeEnum.system,
        event: SSEEventEnum.disconnected,
        data: "Disconnected",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const onError = useCallback((err: Event) => {
    console.error("SSE connection error:", err);
    setMessages((prev) => [
      ...prev,
      {
        type: SSETypeEnum.system,
        event: SSEEventEnum.error,
        data: "Connection error",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const onEvent = useCallback((event: SSEEventEnum, data: unknown) => {
    console.log(`Received ${event} event:`, data);
    setMessages((prev) => [
      ...prev,
      {
        type: SSETypeEnum.system,
        event,
        data,
        timestamp: Date.now(),
      },
    ]);
    if ([SSEEventEnum.heartbeat, SSEEventEnum.connected].includes(event)) {
      return;
    }
    setNotificationCount((prev) => prev + 1);
  }, []);

  const { connected, clientId, error, disconnect } = useSSE({
    onConnect,
    onDisconnect,
    onError,
    onEvent,
    reconnectOnError: true,
    reconnectInterval: 5000,

    userId: "1",
  });

  const resetNotifications = () => {
    setNotificationCount(0);
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">SSE Demo</h1>

      <div className="mb-4 flex items-center gap-2">
        <span>{connected ? "🟢 Connected" : "🔴 Disconnected"}</span>
        {clientId && (
          <span className="text-sm text-gray-500">ID: {clientId}</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-100 p-2 text-red-700">
          Connection error
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={disconnect}
          className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
          disabled={!connected}
        >
          Disconnect
        </button>

        {notificationCount > 0 && (
          <button
            onClick={resetNotifications}
            className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
          >
            <span>Notifications</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-blue-500">
              {notificationCount}
            </span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border">
        <div className="border-b bg-gray-100 p-2 font-medium">Event Log</div>
        <div className="h-96 overflow-y-auto p-2">
          {messages.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              No events received yet
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, i) => (
                <li key={i} className="rounded p-2">
                  <div className="text-sm font-medium text-gray-700 capitalize">
                    {msg.type}{" "}
                    <span className="text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm break-all">
                    {JSON.stringify(msg.data)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
