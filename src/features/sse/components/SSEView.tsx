"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSSESubscription } from "../hooks/useSSESubscription";
import type { ClientSSEMessage } from "../models/SSEModel";
import { api } from "@/trpc/react";
import { Button } from "@/shared/components/ui/button";

interface SSEViewProps {
  userId?: string;
}

/**
 * Main SSE demo view for testing SSE functionality.
 * Shows connection status, latest message, and provides test buttons.
 */
export function SSEView({ userId }: SSEViewProps) {
  const { t } = useTranslation("sse");
  const [messages, setMessages] = useState<ClientSSEMessage[]>([]);

  // tRPC mutations
  const sendTestMessageMutation = api.sse.sendTestMessage.useMutation();

  const {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    messageCount,
    connect,
    disconnect,
  } = useSSESubscription({
    userId: userId,
    onMessage: (message) => {
      setMessages(
        (prev) => [message, ...prev.slice(0, 9)] as ClientSSEMessage[],
      ); // Keep last 10 messages
    },
    onConnect: () => {
      console.log("SSE connected");
    },
    onDisconnect: () => {
      console.log("SSE disconnected");
    },
    onError: (error) => {
      console.error("SSE error", error);
    },
  });

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const sendTestMessage = async (type: "broadcast" | "user") => {
    try {
      await sendTestMessageMutation.mutateAsync({
        type,
        event: "notification",
        data: {
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Test`,
          message: `This is a test ${type} message sent at ${new Date().toLocaleTimeString()}`,
          type: "info",
          timestamp: Date.now(),
        },
        ...(type === "user" && { userId: userId }),
      });
    } catch (error) {
      console.error("Error sending test message:", error);
    }
  };

  const getConnectionStatusColor = () => {
    if (isConnecting) return "text-yellow-600";
    if (isConnected) return "text-green-600";
    if (error) return "text-red-600";
    return "text-gray-600";
  };

  const getConnectionStatusText = () => {
    if (isConnecting) return t("connection.connecting");
    if (isConnected) return t("connection.connected");
    if (error) return t("connection.error");
    return t("connection.disconnected");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-bold text-black">
          {t("demo.pageTitle")}
        </h2>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-black">
            {t("connection.status")}
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className={`font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
            <span className="text-sm text-black text-gray-600">
              {t("connection.messagesReceived", { count: messageCount })}
            </span>
          </div>

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {t("connection.errorMessage", { message: error })}
            </div>
          )}
        </div>

        {/* Connection Controls */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-black">
            {t("controls.connection")}
          </h3>
          <div className="flex gap-2">
            <Button onClick={connect} disabled={isConnected || isConnecting}>
              {t("controls.connect")}
            </Button>
            <Button onClick={disconnect} disabled={!isConnected}>
              {t("controls.disconnect")}
            </Button>
          </div>
        </div>

        {/* Test Message Controls */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-black">
            {t("controls.testMessages")}
          </h3>
          <div className="mb-4 flex gap-2">
            <Button
              onClick={() => sendTestMessage("broadcast")}
              disabled={!isConnected || sendTestMessageMutation.isPending}
              variant="default"
            >
              {sendTestMessageMutation.isPending
                ? t("controls.sending")
                : t("controls.sendBroadcast")}
            </Button>
            <Button
              onClick={() => sendTestMessage("user")}
              disabled={!isConnected || sendTestMessageMutation.isPending}
              variant="secondary"
            >
              {sendTestMessageMutation.isPending
                ? t("controls.sending")
                : t("controls.sendToUser")}
            </Button>
          </div>

          <div className="text-sm text-black text-gray-600">
            <p>{t("controls.userId", { id: userId })}</p>
          </div>

          {sendTestMessageMutation.error && (
            <div className="mt-2 text-sm text-red-600">
              {t("connection.errorMessage", {
                message: sendTestMessageMutation.error.message,
              })}
            </div>
          )}
        </div>

        {/* Latest Message */}
        {lastMessage && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-black">
              {t("messages.latest")}
            </h3>
            <div className="rounded border bg-white p-3">
              <div className="mb-1 text-sm text-gray-600">
                {t("messages.event", { event: lastMessage.event })}
              </div>
              <div className="mb-2 text-sm text-gray-600">
                {t("messages.time", {
                  time: new Date(
                    lastMessage.timestamp ?? 0,
                  ).toLocaleTimeString(),
                })}
              </div>
              <pre className="overflow-auto rounded bg-gray-100 p-2 text-xs text-black">
                {JSON.stringify(lastMessage.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Message History */}
        {messages.length > 0 && (
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-black">
              {t("messages.history")}
            </h3>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className="rounded border bg-white p-3 text-sm"
                >
                  <div className="mb-1 flex items-start justify-between">
                    <span className="font-medium text-blue-600">
                      {message.event}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp ?? 0).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    {typeof message.data === "object" && !message.data.message
                      ? JSON.stringify(message.data)
                      : String(message.data.message)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
