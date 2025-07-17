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
  const [testMessage, setTestMessage] = useState("Hello from SSE!");
  const [notificationTitle, setNotificationTitle] =
    useState("Test Notification");
  const [notificationMessage, setNotificationMessage] = useState(
    "This is a test notification",
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
    await broadcastSSEMessage("demo_message", {
      message: testMessage,
      timestamp: Date.now(),
      sender: "demo",
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
    await broadcastSystemUpdate(
      "System maintenance scheduled for tomorrow at 2 AM",
      "maintenance",
    );
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
    <div className="mx-auto max-w-2xl space-y-8 rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
      {/* Welcome/Intro Section */}
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-extrabold text-gray-900">
          Welcome to the SSE Demo!
        </h1>
        <p className="mb-2 text-gray-700">
          <b>Server-Sent Events (SSE)</b> let the server push real-time updates
          to your browser. This demo shows how you can receive live
          notifications and messages instantly—no page reload needed!
        </p>
        <div className="mb-2 rounded border-l-4 border-blue-400 bg-blue-50 p-3 text-blue-900">
          <b>Try it instantly:</b> This page will send you a live notification
          as soon as you connect. You can also send your own test messages
          below!
        </div>
      </div>

      {/* How to Use Section */}
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-bold text-gray-900">How to Use</h2>
        <ol className="list-inside list-decimal space-y-1 text-gray-800">
          <li>
            Wait for the{" "}
            <span className="inline-block rounded bg-green-100 px-2 py-0.5 align-middle text-xs text-green-800">
              Live
            </span>{" "}
            status above.
          </li>
          <li>Watch for a welcome notification to appear below.</li>
          <li>Send your own test message or notification using the forms.</li>
          <li>
            Try the <b>Try Demo</b> button for an instant example.
          </li>
        </ol>
      </div>

      {/* Connection Status */}
      <div className="mb-2 flex items-center space-x-3">
        <div
          className={`h-4 w-4 rounded-full ${isConnected ? "animate-pulse bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-base font-medium text-gray-800">
          {isConnected ? (
            <span className="inline-flex items-center">
              <span className="mr-1">Connected</span>
              <span className="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                Live
              </span>
            </span>
          ) : (
            "Disconnected"
          )}
          {clientId && (
            <span className="ml-2 text-xs text-gray-500">
              (Client ID: {clientId})
            </span>
          )}
        </span>
        {!isConnected && (
          <Button size="sm" onClick={reconnect} className="ml-2">
            Reconnect
          </Button>
        )}
      </div>

      {/* Try Demo Button */}
      <div className="mb-4">
        <Button
          onClick={testSSEConnection}
          className="rounded bg-blue-600 px-5 py-2 text-base font-semibold text-white shadow hover:bg-blue-700"
        >
          Try Demo
        </Button>
        <span className="ml-3 text-sm text-gray-500">
          (Sends a test notification and message)
        </span>
      </div>

      {/* Last Message Display */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-2 text-lg font-semibold text-gray-800">
          Last Message:
        </h3>
        {lastMessage ? (
          <pre className="overflow-auto rounded bg-gray-100 p-3 font-mono text-sm whitespace-pre-wrap text-gray-700">
            {JSON.stringify(lastMessage, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-400">No messages received yet</p>
        )}
      </div>

      <hr className="my-4" />

      {/* Test Message Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Test Message</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Type a message to broadcast to all clients..."
          />
          <Button
            onClick={handleBroadcastMessage}
            className="px-5 py-2 text-base"
          >
            Send to All
          </Button>
        </div>
        <div className="ml-1 text-xs text-gray-500">
          This will send a message to all connected clients.
        </div>
      </div>

      <hr className="my-4" />

      {/* Notification Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Send Notification
        </h3>
        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Notification title (e.g. 'Welcome!')"
          />
          <input
            type="text"
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Notification message (e.g. 'You have a new message!')"
          />
          <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-base text-gray-900 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <Button
            onClick={handleSendNotification}
            disabled={!userId}
            className="px-5 py-2 text-base"
          >
            Send to User
          </Button>
        </div>
        <div className="ml-1 text-xs text-gray-500">
          Send a notification to a specific user (requires user ID).
        </div>
      </div>

      <hr className="my-4" />

      {/* System Update Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">System Updates</h3>
        <div className="flex space-x-2">
          <Button onClick={handleSystemUpdate} className="px-5 py-2 text-base">
            Send System Update
          </Button>
          <Button
            onClick={handleTestNotification}
            className="px-5 py-2 text-base"
          >
            Send Test Notification
          </Button>
        </div>
        <div className="ml-1 text-xs text-gray-500">
          These will be broadcast to all clients as notifications.
        </div>
      </div>

      <hr className="my-4" />

      {/* Notifications Display */}
      <div className="space-y-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications{" "}
            <span className="ml-1 text-blue-600">({notifications.length})</span>
          </h3>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={addTestNotification}
              className="px-3 py-1 text-sm"
            >
              Add Test
            </Button>
            <Button
              size="sm"
              onClick={testSSEConnection}
              className="px-3 py-1 text-sm"
            >
              Test Connection
            </Button>
            {notifications.length > 0 && (
              <Button
                size="sm"
                onClick={clearNotifications}
                className="px-3 py-1 text-sm"
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
                  className={`mb-1 rounded-lg border-l-4 bg-white p-3 text-gray-900 shadow-sm ${
                    notification.type === "error"
                      ? "border-red-500 bg-red-50"
                      : notification.type === "warning"
                        ? "border-yellow-500 bg-yellow-50"
                        : notification.type === "success"
                          ? "border-green-500 bg-green-50"
                          : "border-blue-500 bg-blue-50"
                  }`}
                >
                  <div className="mb-1 text-base font-semibold">
                    {notification.title}
                  </div>
                  <div className="mb-1 text-sm">{notification.message}</div>
                  <div className="mt-1 text-xs text-gray-500">
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
    </div>
  );
}
