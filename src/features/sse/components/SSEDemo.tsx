"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../features/shared/components/ui/button";
import { useSSE } from "../hooks/useSSE";
import {
  broadcastSSEMessage,
  sendNotificationToUser,
  broadcastSystemUpdate,
} from "../utils/sse-utils";

interface SSEDemoProps {
  userId?: string;
}

export function SSEDemo({ userId }: SSEDemoProps) {
  const [testMessage, setTestMessage] = useState(
    "Arbitrary broadcast message!",
  );
  const [notificationTitle, setNotificationTitle] =
    useState("Test Notification");
  const [notificationMessage, setNotificationMessage] = useState(
    "This is a test notification!",
  );
  const [notificationType, setNotificationType] = useState<
    "info" | "success" | "warning" | "error"
  >("info");
  const [hasMounted, setHasMounted] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      type: "info" | "success" | "warning" | "error";
      timestamp: number;
    }>
  >([]);
  const [autoDemoDone, setAutoDemoDone] = useState(false);

  // Single SSE connection for all functionality
  const { isConnected, clientId, lastMessage, reconnect } = useSSE({
    onConnect: (id) => {
      console.log("SSE Connected with client ID:", id);
      console.log("SSE Connection status:", isConnected);
    },
    onDisconnect: () => {
      console.log("SSE Disconnected");
      console.log("SSE Connection status:", isConnected);
    },
    onError: (error) => {
      console.error("SSE Error occurred in SSEDemo");
      console.error("SSE Error object:", error);
      console.error("SSE Error type:", error.type);
      console.error("SSE Error target:", error.target);
      console.log("SSE Connection status:", isConnected);
    },
    onMessage: (event) => {
      console.log("SSE Message received:", event);
      console.log("SSE Message event type:", event.event);
      console.log("SSE Message data:", event.data);

      // Handle notifications
      if (event.event === "notification") {
        console.log("Processing notification event:", event.data);
        const notification = {
          id: `${Date.now()}-${Math.random()}`,
          title: event.data.title as string,
          message: event.data.message as string,
          type: event.data.type as "info" | "success" | "warning" | "error",
          timestamp: event.data.timestamp as number,
        };
        console.log("Created notification object:", notification);
        setNotifications((prev) => {
          const newNotifications = [notification, ...prev.slice(0, 9)];
          console.log("Updated notifications array:", newNotifications);
          return newNotifications;
        });
      } else {
        console.log("Non-notification event received:", event.event);
      }
    },
  });

  useEffect(() => {
    console.log("SSEDemo component mounted");
    setHasMounted(true);
  }, []);

  // Auto-demo: send a test notification on first load
  useEffect(() => {
    if (isConnected && !autoDemoDone) {
      broadcastSSEMessage("notification", {
        title: "Welcome to the SSE Demo!",
        message:
          "This is a live notification sent automatically to show you how SSE works.",
        type: "success",
        timestamp: Date.now(),
      });
      setAutoDemoDone(true);
    }
  }, [isConnected, autoDemoDone]);

  useEffect(() => {
    console.log("SSE Connection status changed:", isConnected);
    console.log("SSE Client ID:", clientId);
    console.log("SSE Last Message:", lastMessage);
    console.log("Current notifications count:", notifications.length);
  }, [isConnected, clientId, lastMessage, notifications.length]);

  const handleBroadcastMessage = async () => {
    await broadcastSSEMessage("notification", {
      title: testMessage,
      message: "This is a broadcast message sent via SSE",
      type: "info",
      timestamp: Date.now(),
    });
  };

  const handleSendNotification = async () => {
    if (!userId) {
      alert("No user ID provided for notification");
      return;
    }

    await sendNotificationToUser(
      userId,
      notificationTitle,
      notificationMessage,
      notificationType,
    );
  };

  const handleSystemUpdate = async () => {
    await broadcastSSEMessage("notification", {
      title: "System Update",
      message: "This is a system update sent via SSE",
      type: "info",
      timestamp: Date.now(),
    });
  };

  const handleTestNotification = async () => {
    await broadcastSSEMessage("notification", {
      title: "Broadcast Notification",
      message: "This notification was sent to all connected clients",
      type: "info",
      timestamp: Date.now(),
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addTestNotification = async () => {
    // Send a test notification via the backend SSE system
    await broadcastSSEMessage("notification", {
      title: "Test Notification",
      message: "This is a test notification sent via SSE",
      type: "info",
      timestamp: Date.now(),
    });
  };

  const testSSEConnection = async () => {
    try {
      console.log("Testing SSE connection...");

      // Test the status endpoint
      const statusResponse = await fetch("/api/sse?status=true");
      const statusData = await statusResponse.json();
      console.log("SSE Status:", statusData);

      // Test sending a message
      const messageResponse = await fetch("/api/sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "notification",
          data: {
            title: "Connection Test",
            message: "Testing SSE connection",
            type: "info",
            timestamp: Date.now(),
          },
          target: "all",
        }),
      });
      const messageData = await messageResponse.json();
      console.log("SSE Message Response:", messageData);
    } catch (error) {
      console.error("SSE Connection test failed:", error);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-teal-50 to-white p-10 shadow-2xl md:grid-cols-2">
      {/* Left Column: Status, Welcome, How To, Last Message */}
      <div className="flex flex-col space-y-8">
        {/* Connection Status */}
        <div className="flex items-center space-x-4 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-100 to-teal-100 p-4 shadow">
          <div
            className={`h-5 w-5 rounded-full border-2 ${isConnected ? "animate-pulse border-teal-700 bg-teal-500" : "border-red-600 bg-red-400"}`}
          />
          <span className="text-lg font-semibold text-gray-800">
            {isConnected ? (
              <span className="inline-flex items-center">
                <span className="mr-1">Online</span>
                <span className="ml-2 rounded bg-teal-200 px-2 py-0.5 text-xs font-bold text-teal-900">
                  Live
                </span>
              </span>
            ) : (
              "Offline"
            )}
            <br />
            {clientId && (
              <span className="ml-3 text-xs text-gray-500">
                (ID: {clientId})
              </span>
            )}
          </span>
          {!isConnected && (
            <Button
              size="sm"
              onClick={reconnect}
              className="ml-4 bg-purple-600 text-white hover:bg-purple-700"
            >
              Reconnect
            </Button>
          )}
        </div>

        {/* Welcome/Intro Section */}
        <div className="rounded-xl border-l-8 border-teal-400 bg-white/80 p-6 shadow">
          <h1 className="mb-2 text-2xl font-black tracking-tight text-purple-900">
            SSE Live Experience
          </h1>
          <p className="mb-2 text-gray-700">
            <b>Server-Sent Events (SSE)</b> enable real-time updates from server
            to browser. This demo lets you experience instant notifications and
            messages—no reloads!
          </p>
          <div className="mb-2 rounded border-l-4 border-purple-400 bg-purple-50 p-3 text-purple-900">
            <b>Instant Demo:</b> Connect to get a live notification. Try sending
            your own below!
          </div>
        </div>

        {/* How to Use Section */}
        <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-purple-50 p-4">
          <h2 className="mb-2 text-lg font-bold text-teal-900">How to Use</h2>
          <ul className="list-disc space-y-1 pl-5 text-gray-800">
            <li>
              Wait for the{" "}
              <span className="inline-block rounded bg-teal-200 px-2 py-0.5 text-xs text-teal-900">
                Live
              </span>{" "}
              status above.
            </li>
            <li>Watch for a welcome notification below.</li>
            <li>Send a test message or notification using the forms.</li>
            <li>
              Try <b>Try Demo</b> for an instant example.
            </li>
          </ul>
        </div>

        {/* Last Message Display */}
        <div className="rounded-xl border border-purple-100 bg-white/70 p-4 shadow">
          <h3 className="mb-2 text-base font-bold text-purple-800">
            Last Message
          </h3>
          {lastMessage ? (
            <pre className="overflow-auto rounded bg-gray-100 p-3 font-mono text-xs whitespace-pre-wrap text-gray-700">
              {JSON.stringify(lastMessage, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">No messages received yet</p>
          )}
        </div>
      </div>

      {/* Right Column: Actions and Notifications */}
      <div className="flex flex-col space-y-8">
        {/* Notifications Display */}
        <div className="rounded-xl border border-purple-200 bg-white/90 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <h3 className="max-w-full truncate text-base font-bold text-purple-900">
              Notifications{" "}
              <span className="ml-1 text-teal-600">
                ({notifications.length})
              </span>
            </h3>
            <div className="flex min-w-[180px] flex-wrap justify-end space-x-2">
              <Button
                size="sm"
                onClick={addTestNotification}
                className="bg-teal-600 px-3 py-1 text-sm text-white hover:bg-teal-700"
              >
                Add Test
              </Button>
              <Button
                size="sm"
                onClick={testSSEConnection}
                className="bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
              >
                Test Connection
              </Button>
              {notifications.length > 0 && (
                <Button
                  size="sm"
                  onClick={clearNotifications}
                  className="bg-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-400"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {hasMounted ? (
              notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative mb-0.5 flex cursor-pointer flex-col gap-0.5 rounded-xl border-l-8 p-2.5 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                      notification.type === "error"
                        ? "border-red-500 bg-red-100/80"
                        : notification.type === "warning"
                          ? "border-yellow-400 bg-yellow-100/80"
                          : notification.type === "success"
                            ? "border-teal-500 bg-teal-100/80"
                            : "border-purple-500 bg-purple-100/80"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-lg font-bold ${
                          notification.type === "error"
                            ? "bg-red-500 text-white"
                            : notification.type === "warning"
                              ? "bg-yellow-400 text-yellow-900"
                              : notification.type === "success"
                                ? "bg-teal-500 text-white"
                                : "bg-purple-500 text-white"
                        }`}
                      >
                        {notification.type === "error" && "❌"}
                        {notification.type === "warning" && "⚠️"}
                        {notification.type === "success" && "✅"}
                        {notification.type === "info" && "ℹ️"}
                      </span>
                      <span className="truncate text-sm font-bold text-gray-900">
                        {notification.title}
                      </span>
                    </div>
                    <div className="mb-0.5 pl-8 text-xs text-gray-800">
                      {notification.message}
                    </div>
                    <div className="absolute right-3 bottom-1 text-xs text-gray-400 transition-colors group-hover:text-gray-700">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">
                  <span role="img" aria-label="bell">
                    🔔
                  </span>{" "}
                  No notifications yet!
                  <br />
                  Try sending one above, or click <b>Try Demo</b>.
                </div>
              )
            ) : (
              <p className="text-sm text-gray-400">Loading notifications...</p>
            )}
          </div>
        </div>
        {/* Try Demo Button */}
        <div className="flex items-center space-x-4 rounded-xl border border-teal-200 bg-gradient-to-r from-purple-100 to-teal-100 p-4 shadow">
          <Button
            onClick={testSSEConnection}
            className="rounded bg-teal-600 px-6 py-2 text-base font-bold text-white shadow hover:bg-teal-700"
          >
            Try Demo
          </Button>
          <span className="text-sm text-gray-500">
            (Sends a test notification and message)
          </span>
        </div>
        {/* Test Message Section */}
        <div className="rounded-xl border border-teal-200 bg-white/80 p-4">
          <h3 className="mb-2 text-base font-bold text-teal-900">
            Broadcast Message
          </h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              placeholder="Type a message to broadcast..."
            />
            <Button
              onClick={handleBroadcastMessage}
              className="bg-purple-600 px-5 py-2 text-base text-white hover:bg-purple-700"
            >
              Send to All
            </Button>
          </div>
          <div className="mt-1 ml-1 text-xs text-gray-500">
            This will send a message to all connected clients.
          </div>
        </div>
        {/* Notification Section */}
        <div className="rounded-xl border border-purple-200 bg-white/80 p-4">
          <h3 className="mb-2 text-base font-bold text-purple-900">
            Send Notification
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:outline-none"
              placeholder="Notification title (e.g. 'Welcome!')"
            />
            <input
              type="text"
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:outline-none"
              placeholder="Notification message (e.g. 'You have a new message!')"
            />
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value as any)}
              className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-base text-gray-900 focus:ring-2 focus:ring-teal-400 focus:outline-none"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <Button
              onClick={handleSendNotification}
              disabled={!userId}
              className="bg-teal-600 px-5 py-2 text-base text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Send to User
            </Button>
          </div>
          <div className="mt-1 ml-1 text-xs text-gray-500">
            Send a notification to a specific user (requires user ID).
          </div>
        </div>
        {/* System Update Section */}
        <div className="flex space-x-2 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-purple-50 p-4">
          <Button
            onClick={handleSystemUpdate}
            className="bg-purple-600 px-5 py-2 text-base text-white hover:bg-purple-700"
          >
            System Update
          </Button>
          <Button
            onClick={handleTestNotification}
            className="bg-teal-600 px-5 py-2 text-base text-white hover:bg-teal-700"
          >
            Test Notification
          </Button>
        </div>
      </div>
    </div>
  );
}
