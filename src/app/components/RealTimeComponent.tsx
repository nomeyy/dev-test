"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSSE } from "@/hooks/useSSE";
import { useEventSource } from "@/hooks/useEventSource";
import {
  Bell,
  Users,
  Wifi,
  Activity,
  UserPlus,
  UserMinus,
  Home,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export function RealTimeComponent() {
  const { data: session, status: sessionStatus } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [totalConnections, setTotalConnections] = useState(0);

  // Socket.IO for notifications
  const { status, clientId, connectionInfo, addHandler, removeHandler } =
    useSSE({
      autoConnect: true,
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      path: "/socket.io",
      heartbeatInterval: 1000,
      auth: {
        userId: session?.user?.id || undefined,
      },
    });

  // SSE for presence tracking - only connect when user data is available
  const {
    connected: sseConnected,
    addHandler: addSseHandler,
    removeHandler: removeSseHandler,
  } = useEventSource({
    userId: session?.user?.id || undefined,
    username: session?.user?.name || undefined,
  });

  // Only connect to SSE when session is loaded and user data exists
  const shouldConnectSSE =
    sessionStatus === "authenticated" &&
    session?.user?.id &&
    session?.user?.name;

  // Track connection establishment and update counts
  useEffect(() => {
    if (status === "connected" && sseConnected) {
      setIsConnecting(false);
      // Update total connections when both are connected
      setTotalConnections((prev) =>
        Math.max(prev, connectionInfo.totalConnections),
      );
    }
  }, [status, sseConnected, connectionInfo.totalConnections]);

  // Update total connections when connectionInfo changes
  useEffect(() => {
    if (connectionInfo.totalConnections > 0) {
      setTotalConnections(connectionInfo.totalConnections);
    }
  }, [connectionInfo.totalConnections]);

  // Fetch current connection count from server when component mounts
  useEffect(() => {
    const fetchConnectionCount = async () => {
      try {
        const response = await fetch("/api/sse");
        if (response.ok) {
          // This will give us the current SSE connection count
          // We'll also check Socket.IO connections
          setTotalConnections((prev) => Math.max(prev, 1)); // At least 1 (current user)
        }
      } catch (error) {
        console.log("Could not fetch connection count:", error);
      }
    };

    if (shouldConnectSSE) {
      fetchConnectionCount();
    }
  }, [shouldConnectSSE]);

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    // Socket.IO event handlers
    const handleUserConnected = (data: any) => {
      console.log("data ka log===:", data);
      const notification = {
        id: Date.now(),
        type: "user:connected",
        message: `${data.username || data.userId} connected`,
        timestamp: new Date().toLocaleTimeString(),
        data,
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 10));

      // Update connection count
      if (data.totalConnections) {
        setTotalConnections(data.totalConnections);
      }

      // Show browser notification
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "notification",
          title: "User Connected",
          body: `${data.username || data.userId} has joined`,
          icon: "/favicon.ico",
        });
      }
    };

    const handleUserDisconnected = (data: any) => {
      console.log("data ka log===:", data);
      const notification = {
        id: Date.now(),
        type: "user:disconnected",
        message: `${data.username || data.userId} disconnected`,
        timestamp: new Date().toLocaleTimeString(),
        data,
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 10));

      // Update connection count
      if (data.totalConnections) {
        setTotalConnections(data.totalConnections);
      }

      // Show browser notification
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "notification",
          title: "User Disconnected",
          body: `${data.username || data.userId} has left`,
          icon: "/favicon.ico",
        });
      }
    };

    const handlePresence = (data: any) => {
      if (data.activeIds) {
        setActiveIds(data.activeIds);
      }
      // Update connection count from presence data
      if (data.totalConnections) {
        setTotalConnections(data.totalConnections);
      }
    };

    // SSE event handlers
    const handleConnectionUpdate = (data: any) => {
      console.log("SSE connection update:", data);
      // You can add SSE-specific logic here

      // Update connection count from SSE data
      if (data.totalConnections) {
        setTotalConnections(data.totalConnections);
      }
    };

    const handleSseMessage = (data: any) => {
      console.log("SSE message received:", data);
      // Handle SSE messages here
    };

    // Add Socket.IO handlers
    addHandler("user:connected", handleUserConnected);
    addHandler("user:disconnected", handleUserDisconnected);
    addHandler("presence", handlePresence);

    // Only add SSE handlers if we should connect
    if (shouldConnectSSE) {
      addSseHandler("connection-update", handleConnectionUpdate);
      addSseHandler("message", handleSseMessage);
    }

    return () => {
      removeHandler("user:connected");
      removeHandler("user:disconnected");
      removeHandler("presence");
      if (shouldConnectSSE) {
        removeSseHandler("connection-update");
        removeSseHandler("message");
      }
    };
  }, [
    addHandler,
    removeHandler,
    addSseHandler,
    removeSseHandler,
    session?.user?.id,
    session?.user?.name,
    shouldConnectSSE,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "disconnected":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-600" />;
      case "connecting":
        return <Activity className="h-4 w-4 text-yellow-600" />;
      case "disconnected":
        return <Wifi className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Welcome back, {session?.user?.name || "User"}!
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Real-Time Monitoring
          </h1>
          <p className="text-lg text-gray-600">
            Live connection status and user activity
          </p>
        </div>

        {/* Connection Status */}
        {isConnecting && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-blue-800">
                Establishing real-time connections...
              </p>
            </div>
            <p className="mt-2 text-sm text-blue-600">
              This may take a few seconds. Active users will appear once
              connections are established.
            </p>
          </div>
        )}

        {/* Session Status */}
        {sessionStatus === "loading" && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-yellow-800">Loading session...</p>
          </div>
        )}

        {sessionStatus === "unauthenticated" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">
              Please sign in to use real-time features
            </p>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Socket.IO Status */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Socket.IO Status
              </h3>
              {getStatusIcon(status)}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Status:{" "}
                <span className={`font-medium ${getStatusColor(status)}`}>
                  {status.toUpperCase()}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Client ID:{" "}
                <span className="font-medium text-gray-800">
                  {clientId || "Not connected"}
                </span>
              </p>
            </div>
          </div>

          {/* SSE Status */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                SSE Status
              </h3>
              {sseConnected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <Wifi className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Status:{" "}
                <span
                  className={`font-medium ${sseConnected ? "text-green-600" : "text-red-600"}`}
                >
                  {sseConnected ? "CONNECTED" : "DISCONNECTED"}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Type:{" "}
                <span className="font-medium text-gray-800">
                  Server-Sent Events
                </span>
              </p>
              {!shouldConnectSSE && (
                <p className="text-xs text-gray-500">
                  Waiting for user data...
                </p>
              )}
            </div>
          </div>

          {/* Active Users */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Active Users
              </h3>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Active IDs:{" "}
                <span className="font-medium text-gray-800">
                  {activeIds.length}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Active IDs List */}
        {activeIds.length > 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Active Client IDs
            </h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {activeIds.map((id, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-blue-50 px-3 py-2 font-mono text-sm text-blue-800"
                >
                  {id}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !isConnecting && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <div className="text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No Active Users
                </h3>
                <p className="text-gray-600">
                  {isConnecting
                    ? "Establishing connections..."
                    : "No users are currently active. Try opening another tab to see real-time updates."}
                </p>
              </div>
            </div>
          )
        )}

        {/* Notifications */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Notifications
            </h3>
            <Bell className="h-5 w-5 text-gray-600" />
          </div>
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No notifications yet
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-center rounded-lg border p-3 ${
                    notification.type === "user:connected"
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  {notification.type === "user:connected" ? (
                    <UserPlus className="mr-3 h-4 w-4 text-green-600" />
                  ) : (
                    <UserMinus className="mr-3 h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SSE Tester - only show when user is authenticated */}
        {shouldConnectSSE && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              SSE Testing
            </h3>
            <SseTester
              userId={session?.user?.id ? String(session.user.id) : undefined}
              username={
                session?.user?.name ? String(session.user.name) : undefined
              }
              activeIds={activeIds}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// SSE Tester Component
function SseTester({
  userId,
  username,
  activeIds,
}: {
  userId?: string;
  username?: string;
  activeIds: string[];
}) {
  const { connected, addHandler, removeHandler } = useEventSource({
    userId,
    username,
  });
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [activeUsers, setActiveUsers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    const onConn = (d: any) => {
      if (typeof d?.totalConnections === "number") setTotal(d.totalConnections);
      setEvents((prev) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            kind: "connection-update",
            ...d,
          },
          ...prev,
        ].slice(0, 10),
      );
    };

    // Update active users list from props
    if (activeIds.length > 0) {
      console.log("Active IDs received:", activeIds);
      const users = activeIds.map((id: string) => ({
        id,
        name: `User ${id.slice(0, 8)}`,
      }));
      setActiveUsers(users);
    } else {
      setActiveUsers([]);
    }

    const onMsg = (d: any) => {
      setEvents((prev) =>
        [
          { at: new Date().toLocaleTimeString(), kind: "message", ...d },
          ...prev,
        ].slice(0, 10),
      );
      const messageText =
        d?.data?.message || d?.message || "SSE message received";
      // addNotification({ type: "sse:message", message: messageText, data: d });
    };

    addHandler("connection-update", onConn);
    addHandler("message", onMsg);
    return () => {
      removeHandler("connection-update");
      removeHandler("message");
    };
  }, [addHandler, removeHandler, activeIds]);

  const openModal = () => {
    setShowModal(true);
    setSelectedUsers([]);
    setMessage("");
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUsers([]);
    setMessage("");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(activeUsers.map((user) => user.id));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  const sendMessage = async () => {
    if (!message.trim() || selectedUsers.length === 0) return;

    const payload = {
      clientId: "server",
      type: "data:update",
      data: {
        message: message.trim(),
        recipients: selectedUsers,
        broadcast: false, // Never broadcast when sending to selected users
        targetType: "selected", // Indicate this is targeted, not broadcast
      },
      timestamp: new Date().toISOString(),
    };

    console.log("Sending targeted message:", payload);

    // Add sent message to events immediately
    setEvents((prev) =>
      [
        {
          at: new Date().toLocaleTimeString(),
          kind: "sent",
          type: "message",
          message: message.trim(),
          recipients: selectedUsers,
          isOutgoing: true,
        },
        ...prev,
      ].slice(0, 10),
    );

    try {
      setBusy(true);
      await fetch("/api/sse/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      closeModal();
    } finally {
      setBusy(false);
    }
  };

  const broadcastToAll = async () => {
    if (!message.trim()) return;

    const payload = {
      clientId: "server",
      type: "data:update",
      data: {
        message: message.trim(),
        recipients: activeUsers.map((user) => user.id),
        broadcast: true, // This is a broadcast to all users
        targetType: "broadcast", // Indicate this is a broadcast
      },
      timestamp: new Date().toISOString(),
    };

    console.log("Broadcasting to all users:", payload);

    // Add broadcast message to sender's events list
    setEvents((prev) =>
      [
        {
          at: new Date().toLocaleTimeString(),
          kind: "broadcast",
          type: "message",
          message: message.trim(),
          recipients: activeUsers.map((user) => user.id),
          isOutgoing: true,
        },
        ...prev,
      ].slice(0, 10),
    );

    try {
      setBusy(true);
      await fetch("/api/sse/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      closeModal();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span
          className={`rounded px-2 py-1 text-xs ${connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {connected ? "connected" : "disconnected"}
        </span>
      </div>

      <button
        onClick={openModal}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? "Sending..." : "Send Message to Users"}
      </button>

      {/* Message Modal */}
      {showModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Message to Users
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Active Users List */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                  Select Recipients
                  {selectedUsers.length > 0 && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-600">
                      {selectedUsers.length} selected
                    </span>
                  )}
                </h4>
                <div className="space-x-2">
                  <button
                    onClick={selectAllUsers}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllUsers}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto rounded-md border border-gray-200 p-2">
                {activeUsers.length > 0 ? (
                  <div className="space-y-2">
                    {activeUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">
                          {user.name}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No active users found
                  </p>
                )}
              </div>
            </div>

            {/* Message Textarea */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                rows={4}
              />
            </div>

            {/* Debug Info */}
            {process.env.NODE_ENV === "development" && (
              <div className="mb-4 rounded-md bg-gray-100 p-3 text-xs">
                <p>
                  <strong>Debug Info:</strong>
                </p>
                <p>Selected Users: {selectedUsers.length}</p>
                <p>Active Users: {activeUsers.length}</p>
                <p>Message Length: {message.length}</p>
                <p>Selected IDs: {selectedUsers.join(", ")}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                disabled={!message.trim() || selectedUsers.length === 0 || busy}
                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? "Sending..."
                  : `Send to ${selectedUsers.length} Selected`}
              </button>
              <button
                onClick={broadcastToAll}
                disabled={!message.trim() || busy}
                className="rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending..." : "Broadcast to All"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto">
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          Recent Messages & Events:
        </h4>
        <ul className="space-y-1 text-sm">
          {events.map((e, i) => (
            <li key={i} className="border-b border-gray-100 py-1">
              <span className="text-gray-500">{e.at}</span> —
              <span
                className={`font-medium ${e.isOutgoing ? "text-green-600" : "text-blue-600"}`}
              >
                {e.kind === "broadcast" ? "BROADCAST" : e.kind.toUpperCase()}
              </span>{" "}
              —
              <span className="text-gray-700">
                {e.kind === "message" && e.data?.message
                  ? e.data.message
                  : e.kind === "broadcast"
                    ? e.message
                    : String(e.type)}
              </span>
              {e.isOutgoing && e.recipients && (
                <span className="ml-2 text-xs text-gray-500">
                  → {e.recipients.length} user
                  {e.recipients.length !== 1 ? "s" : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
