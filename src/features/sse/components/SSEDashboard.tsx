"use client";

import { useState } from "react";
import { useSSE } from "../hooks/useSSE";
import { ConnectionStatus } from "./ConnectionStatus";
import { EventSender } from "./EventSender";
import { EventLog } from "./EventLog";

export function SSEDashboard() {
  const [messages, setMessages] = useState<
    Array<{ type: string; data: any; timestamp: number }>
  >([]);
  const [currentClientId, setCurrentClientId] = useState<string>();

  const { isConnected, error } = useSSE({
    onConnect: (clientId) => {
      setCurrentClientId(clientId);
      setMessages((prev) => [
        {
          type: "system",
          data: `Connected with ID: ${clientId}`,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    },
    onEvent: (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [
        {
          type: event.type,
          data,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    },
    eventTypes: ["notification", "message", "system-update", "custom"],
  });

  const sendEvent = async (type: string, data: any, targetId?: string) => {
    try {
      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          data,
          targetClientId: targetId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send event");
      }
    } catch (error) {
      console.error("Error sending event:", error);
      throw error;
    }
  };

  const clearLog = () => {
    setMessages([]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ConnectionStatus
            isConnected={isConnected}
            clientId={currentClientId}
            error={error}
          />
          <EventSender
            onSendEvent={sendEvent}
            currentClientId={currentClientId}
          />
        </div>
        <EventLog messages={messages} onClear={clearLog} />
      </div>
    </div>
  );
}
