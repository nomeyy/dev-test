"use client";

import { useState, useEffect } from "react";
import { SSE_CONFIG, type SSEEventType } from "../sse/constants";

interface SSEDemoMessage {
  id: string;
  type: SSEEventType;
  content: string;
  timestamp: Date;
  clientId?: string;
}

interface SSEStats {
  clientCount: number;
  connectedUsers: string[];
  timestamp: string;
}

export function SSEDemoView() {
  const [messages, setMessages] = useState<SSEDemoMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [stats, setStats] = useState<SSEStats>({
    clientCount: 0,
    connectedUsers: [],
    timestamp: "",
  });
  const [currentClientId, setCurrentClientId] = useState<string>("");

  const fetchStats = async () => {
    try {
      const response = await fetch(SSE_CONFIG.ENDPOINTS.STATS);
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
      }
    } catch (error) {
      console.error("Failed to fetch SSE stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    const statsInterval = setInterval(fetchStats, 2000);

    const es = new EventSource(SSE_CONFIG.ENDPOINTS.SSE_STREAM);

    es.onopen = () => {
      setIsConnected(true);
      addMessage(SSE_CONFIG.EVENTS.CONNECTION, SSE_CONFIG.MESSAGES.CONNECTED);
      fetchStats();
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.clientId && !currentClientId) {
          setCurrentClientId(data.clientId);
        }
        if (data.message && data.message.trim() !== ": ping") {
          addMessage(
            data.type || SSE_CONFIG.EVENTS.HEARTBEAT,
            data.message,
            data.clientId,
          );
        }
      } catch (error) {
        // Handle non-JSON messages
        if (event.data && event.data.trim() !== ": ping") {
          addMessage(SSE_CONFIG.EVENTS.HEARTBEAT, event.data);
        }
      }
    };

    es.addEventListener(SSE_CONFIG.EVENTS.NOTIFICATION, (event) => {
      const data = JSON.parse(event.data);
      addMessage(
        SSE_CONFIG.EVENTS.NOTIFICATION,
        data.message || "Notification received",
      );
    });

    es.addEventListener(SSE_CONFIG.EVENTS.ALERT, (event) => {
      const data = JSON.parse(event.data);
      addMessage(SSE_CONFIG.EVENTS.ALERT, data.message || "Alert received");
    });

    es.onerror = () => {
      setIsConnected(false);
      addMessage(SSE_CONFIG.EVENTS.ERROR, SSE_CONFIG.MESSAGES.CONNECTION_ERROR);
    };

    setEventSource(es);

    return () => {
      clearInterval(statsInterval);
      es.close();
      setIsConnected(false);
    };
  }, [currentClientId]);

  const addMessage = (
    type: SSEEventType,
    content: string,
    clientId?: string,
  ) => {
    const message: SSEDemoMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      clientId,
    };

    setMessages((prev) => [
      ...prev.slice(-SSE_CONFIG.UI.MESSAGE_DISPLAY_LIMIT + 1),
      message,
    ]);
  };

  const triggerEvent = async (eventType: string, message: string) => {
    try {
      const response = await fetch(SSE_CONFIG.ENDPOINTS.TRIGGER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: eventType,
          data: { message },
        }),
      });

      if (!response.ok) {
        throw new Error(SSE_CONFIG.MESSAGES.TRIGGER_ERROR);
      }

      addMessage(
        SSE_CONFIG.EVENTS.CONNECTION,
        `${eventType} sent successfully`,
      );
    } catch (error) {
      console.error("Trigger error:", error);
      addMessage(SSE_CONFIG.EVENTS.ERROR, SSE_CONFIG.MESSAGES.TRIGGER_ERROR);
    }
  };

  const handleNotification = () =>
    triggerEvent(
      SSE_CONFIG.EVENTS.NOTIFICATION,
      SSE_CONFIG.MESSAGES.TEST_NOTIFICATION,
    );
  const handleAlert = () =>
    triggerEvent(SSE_CONFIG.EVENTS.ALERT, SSE_CONFIG.MESSAGES.TEST_ALERT);
  const clearMessages = () => setMessages([]);

  const getMessageStyle = (type: SSEEventType) => {
    switch (type) {
      case SSE_CONFIG.EVENTS.NOTIFICATION:
        return "bg-blue-50 border-blue-200 text-blue-800 border-l-4 border-l-blue-500";
      case SSE_CONFIG.EVENTS.ALERT:
        return "bg-orange-50 border-orange-200 text-orange-800 border-l-4 border-l-orange-500";
      case SSE_CONFIG.EVENTS.CONNECTION:
        return "bg-green-50 border-green-200 text-green-800 border-l-4 border-l-green-500";
      case SSE_CONFIG.EVENTS.ERROR:
        return "bg-red-50 border-red-200 text-red-800 border-l-4 border-l-red-500";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700 border-l-4 border-l-gray-400";
    }
  };

  const getMessageIcon = (type: SSEEventType) => {
    switch (type) {
      case SSE_CONFIG.EVENTS.NOTIFICATION:
        return "📢";
      case SSE_CONFIG.EVENTS.ALERT:
        return "⚠️";
      case SSE_CONFIG.EVENTS.CONNECTION:
        return "✅";
      case SSE_CONFIG.EVENTS.ERROR:
        return "❌";
      default:
        return "💬";
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-white p-6 text-gray-900">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
        Server-Sent Events Demo
      </h1>

      {/* Connection Status */}
      <div className="mb-6 rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-4 w-4 rounded-full ${isConnected ? "animate-pulse bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-lg font-semibold">
              {isConnected
                ? SSE_CONFIG.UI.STATUS_CONNECTED
                : SSE_CONFIG.UI.STATUS_DISCONNECTED}
            </span>
            {currentClientId && (
              <span className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">
                ID: {currentClientId.split("_")[1]}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Messages: {messages.length}</span>
            <span className="font-semibold">
              Active Clients: {stats.clientCount}
            </span>
            {stats.connectedUsers.length > 0 && (
              <span>Users: {stats.connectedUsers.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="mb-6 rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-gray-700">
          Event Triggers
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleNotification}
            disabled={!isConnected}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            📢 {SSE_CONFIG.UI.BUTTON_SEND_NOTIFICATION}
          </button>
          <button
            onClick={handleAlert}
            disabled={!isConnected}
            className="rounded-lg bg-orange-600 px-6 py-2 text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⚠️ {SSE_CONFIG.UI.BUTTON_SEND_ALERT}
          </button>
          <button
            onClick={clearMessages}
            className="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
          >
            🗑️ {SSE_CONFIG.UI.BUTTON_CLEAR_MESSAGES}
          </button>
        </div>
      </div>

      {/* Messages Panel */}
      <div className="rounded-lg border-2 border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <h3 className="text-lg font-semibold text-gray-700">Live Messages</h3>
        </div>
        <div className="max-h-96 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No messages yet. Connect and trigger some events!
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg border p-3 ${getMessageStyle(message.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 text-lg">
                      {getMessageIcon(message.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {message.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.clientId && (
                          <span className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-600">
                            {message.clientId.split("_")[1]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
