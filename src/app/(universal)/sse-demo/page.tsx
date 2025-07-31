"use client";

import { useSSE } from "@/features/sse";
import { Button } from "@/shared/components/ui/button";
import { useEffect, useState } from "react";

/**
 * SSE Demo Page
 *
 * This demo showcases the complete Server-Sent Events implementation
 * with real-time bidirectional communication between client and server.
 *
 * Features demonstrated:
 * - Real-time SSE connection management
 * - Multiple event types with rich JSON payloads
 * - Connection status monitoring
 * - Event history tracking
 * - Manual connection control
 * - Automatic reconnection handling
 * - Dark/light mode support
 */
interface ReceivedEvent {
  id: string;
  event: string;
  data: unknown;
  timestamp: Date;
}

const SSEDemoPage = () => {
  const sse = useSSE({ debug: true, autoReconnect: true });
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");
  const [messageCount, setMessageCount] = useState<number>(0);
  const [events, setEvents] = useState<ReceivedEvent[]>([]);

  // Subscribe to SSE events
  useEffect(() => {
    const eventTypes = [
      "notification",
      "heartbeat",
      "connection_established",
      "video_event",
      "user_event",
      "system_event",
    ];

    const unsubscribers = eventTypes.map((eventType) =>
      sse.subscribe(eventType, (data: unknown) => {
        const newEvent: ReceivedEvent = {
          id: `${eventType}_${Date.now()}_${Math.random()}`,
          event: eventType,
          data,
          timestamp: new Date(),
        };

        setLatestMessage(JSON.stringify(data, null, 2));
        setMessageCount((prev) => prev + 1);
        setEvents((prev) => [newEvent, ...prev].slice(0, 20)); // Keep last 20 events
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendTestMessage = async (eventType: string, payload: object) => {
    try {
      const response = await fetch("/api/sse/demo/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Failed to send ${eventType} event`);
      }
    } catch (error) {
      console.error(`Error sending ${eventType} event:`, error);
    }
  };

  const sendVideoEvent = () => {
    void sendTestMessage("video_event", {
      message: "Video processing completed",
      type: "video_event", // This will be the event type
      videoId: "vid_" + Math.random().toString(36).substr(2, 9),
      duration: 145,
      thumbnail: "https://example.com/thumb.jpg",
      timestamp: new Date().toISOString(),
    });
  };

  const sendUserEvent = () => {
    void sendTestMessage("user_event", {
      message: "New follower joined",
      type: "user_event", // This will be the event type
      userId: "user_" + Math.random().toString(36).substr(2, 9),
      followerName: "Alex Johnson",
      totalFollowers: Math.floor(Math.random() * 1000) + 100,
      timestamp: new Date().toISOString(),
    });
  };

  const sendSystemEvent = () => {
    void sendTestMessage("system_event", {
      message: "System maintenance scheduled",
      type: "system_event", // This will be the event type
      level: "warning",
      maintenanceWindow: "2025-08-01T02:00:00Z",
      estimatedDuration: "30 minutes",
      affectedServices: ["uploads", "encoding"],
      timestamp: new Date().toISOString(),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "heartbeat":
        return "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100";
      case "connection_established":
        return "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100";
      case "notification":
        return "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100";
      case "video_event":
        return "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100";
      case "user_event":
        return "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100";
      case "system_event":
        return "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100";
      default:
        return "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100";
    }
  };

  const clearEvents = () => {
    setEvents([]);
    setMessageCount(0);
    setLatestMessage("No messages yet");
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">SSE Demo</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Interactive demonstration of Server-Sent Events with real-time
          communication, multiple event types, and connection management.
        </p>
      </div>

      <div className="space-y-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-800">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`h-3 w-3 rounded-full ${sse.status === "connected" ? "animate-pulse bg-green-500" : sse.status === "connecting" ? "animate-pulse bg-yellow-500" : sse.status === "error" ? "bg-red-500" : "bg-gray-400"}`}
            />
            <span className={`font-medium ${getStatusColor(sse.status)}`}>
              Status: {sse.status}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Messages: {messageCount}
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={sse.connect}
              disabled={
                sse.status === "connected" || sse.status === "connecting"
              }
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Connect
            </Button>
            <Button
              onClick={sse.disconnect}
              disabled={sse.status === "disconnected"}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Disconnect
            </Button>
            <Button
              onClick={clearEvents}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Clear Events
            </Button>
          </div>
        </div>

        {/* Send Message Buttons */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Send Test Events:
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Button
              onClick={sendVideoEvent}
              disabled={sse.status !== "connected"}
              className="bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 dark:bg-purple-600 dark:text-white dark:hover:bg-purple-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
            >
              Video Event
            </Button>
            <Button
              onClick={sendUserEvent}
              disabled={sse.status !== "connected"}
              className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
            >
              User Event
            </Button>
            <Button
              onClick={sendSystemEvent}
              disabled={sse.status !== "connected"}
              className="bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500 dark:bg-orange-600 dark:text-white dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
            >
              System Event
            </Button>
          </div>
        </div>

        {/* Latest Message Display */}
        <div>
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
            Latest SSE Message:
          </h3>
          <div className="rounded border bg-gray-100 p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-800">
            <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {latestMessage}
            </pre>
          </div>
        </div>

        {/* Events History */}
        <div>
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
            Recent Events:
          </h3>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            {events.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">
                No events yet
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between space-x-3 rounded border bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getEventColor(event.event)}`}
                      >
                        {event.event}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {JSON.stringify(event.data, null, 2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSEDemoPage;
