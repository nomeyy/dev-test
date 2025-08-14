"use client";

import { type SSEEvent, useSSE } from "@/features/sse";
import { useState } from "react";

export default function SSEPage() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [message, setMessage] = useState("");
  const [subscribedEvents, setSubscribedEvents] = useState({
    custom_broadcast_event: true,
    broadcast_notification_event: true,
  });

  const [sendTargets, setSendTargets] = useState({
    userIds: [],
    connectionIds: [],
  });

  const subscribedEventNames = Object.entries(subscribedEvents)
    .filter(([, value]) => value)
    .map(([key]) => key);

  const { isConnected, connectionId, broadcastMessage, sendMessage } = useSSE({
    broadcastOptions: {
      eventNames: subscribedEventNames,
    },
    sendOptions: {
      userIds: sendTargets.userIds,
      connectionIds: sendTargets.connectionIds,
    },
    onMessage: (event) => {
      setEvents((prev) => [...prev, event]);
    },
    onError: (error) => {
      console.error("Page error:", error);
    },
  });

  const handleBroadcastMessage = () => {
    if (!message.trim()) return;

    void broadcastMessage({
      type: "custom",
      eventName: "custom_broadcast_event",
      data: { message: message.trim() },
    });

    setMessage("");
  };

  const handleBroadcastNotification = () => {
    void broadcastMessage({
      type: "notification",
      eventName: "broadcast_notification_event",
      data: {
        title: "Demo Notification",
        body: "This is a test notification",
        timestamp: new Date().toISOString(),
      },
    });
  };

  const handleSendNotification = () => {
    void sendMessage({
      type: "notification",
      eventName: "send_notification_event",
      data: {
        title: "Notification",
        body: `This is a test notification send to ${sendTargets.userIds.length} users and ${sendTargets.connectionIds.length} connections.`,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const updateSubscribedEvents = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { value, checked } = event.target;
    setSubscribedEvents((prev) => ({
      ...prev,
      [value]: checked,
    }));
  };

  const updateSendTargets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, name } = event.target;
    setSendTargets((prev) => {
      return {
        ...prev,
        [name]: value ? value.split(" ") : [],
      };
    });
  };

  return (
    <div className="rounded-lg bg-gradient-to-b from-[#15162c] to-[#2e026d] p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold">SSE Demo Page</h2>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {connectionId && (
          <p className="text-sm text-gray-400">Connection ID: {connectionId}</p>
        )}
      </div>

      <section className="mb-8 rounded-md border border-gray-200 p-4">
        <h3 className="mb-2 text-lg font-semibold">Broadcast Section</h3>
        <div>
          <h4>Subscribe to Events:</h4>
          <label className="mb-2 flex items-center gap-2">
            custom_broadcast_event
            <input
              type="checkbox"
              checked={subscribedEvents.custom_broadcast_event}
              value="custom_broadcast_event"
              onChange={updateSubscribedEvents}
            />
          </label>

          <label className="mb-2 flex items-center gap-2">
            broadcast_notification_event
            <input
              type="checkbox"
              checked={subscribedEvents.broadcast_notification_event}
              value="broadcast_notification_event"
              onChange={updateSubscribedEvents}
            />
          </label>
        </div>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleBroadcastMessage()}
          />
          <button
            onClick={handleBroadcastMessage}
            disabled={!isConnected || !message.trim()}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Broadcast Message
          </button>
        </div>

        <button
          onClick={handleBroadcastNotification}
          disabled={!isConnected}
          className="mt-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Broadcast Notification
        </button>
      </section>

      <section className="mb-8 rounded-md border border-gray-200 p-4">
        <h3 className="mb-2 text-lg font-semibold">
          Send to specific target Section
        </h3>
        <div>
          <h4>Send to to Events:</h4>
          <label className="mb-2 flex items-center gap-2">
            User IDs (divided by space):
            <input
              className="block rounded-md border border-gray-300"
              type="text"
              name="userIds"
              value={sendTargets.userIds.join(" ")}
              onChange={(e) => updateSendTargets(e)}
            />
          </label>
          <label className="mb-2 flex items-center gap-2">
            Connection IDs (divided by space):
            <input
              className="rounded-md border border-gray-300"
              type="text"
              name="connectionIds"
              value={sendTargets.connectionIds.join(" ")}
              onChange={(e) => updateSendTargets(e)}
            />
          </label>
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={handleSendNotification}
            disabled={
              !isConnected ||
              (!sendTargets.userIds.length && !sendTargets.connectionIds.length)
            }
            className="mt-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Notification
          </button>
        </div>
      </section>

      <div>
        <h3 className="mb-2 text-lg font-semibold">Received Events</h3>
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-2">
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No events received yet...</p>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="rounded bg-gray-50 p-2 text-sm">
                  <div className="font-medium text-blue-600">
                    Type:{event.type}
                  </div>
                  <div className="font-medium text-blue-600">
                    Event Name:{event.eventName}
                  </div>
                  <div className="text-gray-700">
                    {JSON.stringify(event.data)}
                  </div>
                  {event?.timestamp && (
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(event?.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
