"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useEventSubscription } from "@/features/sse";
import { api } from "@/trpc/react";
import { Button } from "@/shared/components/ui/button";
import { nanoid } from "nanoid";
import { EVENT_DESTINATION } from "@/lib/sse/types";

export function DemoView() {
  const { t } = useTranslation("sse");

  const sendTestMessageMutation = api.sse.sendTestMessage.useMutation();
  const [userId] = useState(nanoid());

  const {
    isConnected,
    isConnecting,
    error,
    latestMessage,
    connect,
    disconnect,
  } = useEventSubscription({
    userId: userId,

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

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const sendTestMessage = async (
    type: EVENT_DESTINATION.ALL | EVENT_DESTINATION.USER,
  ) => {
    try {
      await sendTestMessageMutation.mutateAsync({
        type,
        event: "message",
        data: {
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Test`,
          message: `This is a test ${type} message sent at ${new Date().toLocaleTimeString()}`,
          type: "info",
          timestamp: Date.now(),
        },
        ...(type === EVENT_DESTINATION.USER && { userId: userId }),
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
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="mb-3 text-2xl font-bold text-black">SSE Demo</h2>

        <div className="mb-4 rounded-lg bg-gray-50 p-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className={`font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
          </div>

          <div className="text-sm text-black text-gray-600">
            <p>{t("actions.userId", { id: userId })}</p>
          </div>

          <div className="flex gap-1 py-2">
            <Button onClick={connect} disabled={isConnected || isConnecting}>
              {t("actions.connect")}
            </Button>
            <Button onClick={disconnect} disabled={!isConnected}>
              {t("actions.disconnect")}
            </Button>
          </div>

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {t("connection.errorMessage", { message: error })}
            </div>
          )}
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 p-2">
          <div className="mb-3 flex gap-1">
            <Button
              onClick={() => sendTestMessage(EVENT_DESTINATION.ALL)}
              disabled={!isConnected || sendTestMessageMutation.isPending}
              variant="default"
            >
              {sendTestMessageMutation.isPending
                ? t("actions.sending")
                : t("actions.sendToAll")}
            </Button>
            <Button
              onClick={() => sendTestMessage(EVENT_DESTINATION.USER)}
              disabled={!isConnected || sendTestMessageMutation.isPending}
              variant="secondary"
            >
              {sendTestMessageMutation.isPending
                ? t("actions.sending")
                : t("actions.sendToUser")}
            </Button>
          </div>

          {sendTestMessageMutation.error && (
            <div className="mt-2 text-sm text-red-600">
              {t("connection.errorMessage", {
                message: sendTestMessageMutation.error.message,
              })}
            </div>
          )}
        </div>

        {latestMessage && (
          <div className="mb-4 rounded-lg bg-gray-50 p-2">
            <div className="rounded border bg-white p-2">
              <div className="mb-1 text-sm text-gray-600">
                {t("connection.event", { event: latestMessage.event })}
              </div>
              <div className="mb-2 text-sm text-gray-600">
                {t("connection.time", {
                  time: new Date(
                    latestMessage.timestamp ?? 0,
                  ).toLocaleTimeString(),
                })}
              </div>
              <pre className="overflow-auto rounded bg-gray-100 p-1 text-xs text-black">
                {JSON.stringify(latestMessage.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
