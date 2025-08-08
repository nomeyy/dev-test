"use client";

import { useEffect, useState } from "react";

type ClientInfo = {
  id: string;
  name?: string;
  connectionCount: number;
  connectedAt: number;
  lastSeen: number;
};

type NotificationForm = {
  clientId: string;
  event: string;
  message: string;
  broadcast: boolean;
};

export default function AdminDashboard() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationForm>({
    clientId: "",
    event: "notification",
    message: "",
    broadcast: false,
  });
  const [sending, setSending] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/sse/clients?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { clients?: ClientInfo[] };
      setClients(data.clients ?? []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notification.message.trim()) {
      alert("Please enter a message");
      return;
    }

    if (!notification.broadcast && !notification.clientId) {
      alert("Please select a client or choose broadcast");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/sse/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: notification.broadcast ? undefined : notification.clientId,
          event: notification.event,
          payload: {
            message: notification.message,
            timestamp: Date.now(),
            from: "admin",
          },
          broadcast: notification.broadcast,
        }),
      });

      type NotifyResp = {
        ok: boolean;
        connections?: number;
        error?: string;
        sent?: boolean;
        clientId?: string;
      };
      const result = (await response.json()) as NotifyResp;
      if (result.ok) {
        alert(
          `Notification sent successfully! ${
            notification.broadcast
              ? `Broadcasted to ${result.connections ?? 0} connections`
              : `Sent to client ${notification.clientId}`
          }`,
        );
        setNotification((prev) => ({ ...prev, message: "" }));
      } else {
        alert(
          `Failed to send notification: ${result.error ?? "Unknown error"}`,
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Error sending notification: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    void fetchClients();
    // Auto-refresh every 5 seconds
    const interval = window.setInterval(() => {
      void fetchClients();
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Animated Background Elements */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-purple-500/10 blur-3xl"></div>
          <div className="absolute right-1/4 bottom-1/4 h-80 w-80 animate-pulse rounded-full bg-blue-500/10 blur-3xl delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 h-48 w-48 animate-pulse rounded-full bg-indigo-500/10 blur-3xl delay-500"></div>
        </div>

        <div className="relative z-10 mb-8 rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-4xl font-bold text-transparent">
                  Admin Dashboard
                </h1>
                <p className="mt-1 text-purple-200">
                  Manage real-time notifications
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white/80">
                Last updated
              </div>
              <div className="text-xs text-purple-200">
                {lastUpdate || "Loading..."}
              </div>
            </div>
          </div>

          {/* Send Notification Section */}
          <div className="mb-8 rounded-2xl border border-purple-300/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-8 shadow-xl backdrop-blur-sm">
            <div className="mb-6 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-400 to-pink-400">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Send Notification
              </h2>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-200">
                  Event Type
                </label>
                <input
                  type="text"
                  value={notification.event}
                  onChange={(e) =>
                    setNotification((prev) => ({
                      ...prev,
                      event: e.target.value,
                    }))
                  }
                  disabled
                  className="w-full rounded-xl border border-purple-300/30 bg-white/10 px-4 py-3 text-white placeholder-white/60 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-purple-400"
                  placeholder="Notification"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-200">
                  Target Client
                </label>
                <select
                  value={notification.clientId}
                  onChange={(e) =>
                    setNotification((prev) => ({
                      ...prev,
                      clientId: e.target.value,
                    }))
                  }
                  disabled={notification.broadcast}
                  className="w-full rounded-xl border border-purple-300/30 bg-white/10 px-4 py-3 text-white backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-purple-400 disabled:bg-white/5 disabled:text-white/50"
                >
                  <option value="" className="bg-gray-800 text-white">
                    Select a client
                  </option>
                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                      className="bg-gray-800 text-white"
                    >
                      {client.name ?? "Unnamed"} ({client.id.slice(0, 12)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="group flex cursor-pointer items-center space-x-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notification.broadcast}
                    onChange={(e) =>
                      setNotification((prev) => ({
                        ...prev,
                        broadcast: e.target.checked,
                      }))
                    }
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-6 rounded-sm border-2 transition-all duration-200 ${
                      notification.broadcast
                        ? "border-purple-400 bg-gradient-to-r from-purple-400 to-pink-400"
                        : "border-purple-300/50 bg-white/10"
                    }`}
                  >
                    {notification.broadcast && (
                      <svg
                        className="absolute top-1 left-1 h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="font-medium text-purple-200 transition-colors duration-200 group-hover:text-white">
                  Broadcast to all clients
                </span>
              </label>
            </div>

            <div className="mb-6 space-y-2">
              <label className="block text-sm font-medium text-purple-200">
                Message
              </label>
              <textarea
                value={notification.message}
                onChange={(e) =>
                  setNotification((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-purple-300/30 bg-white/10 px-4 py-3 text-white placeholder-white/60 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-purple-400"
                placeholder="Enter your notification message..."
              />
            </div>

            <button
              onClick={sendNotification}
              disabled={sending}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-600 hover:to-pink-600 disabled:scale-100 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
            >
              <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-1000 group-hover:translate-x-full"></div>
              <span className="relative">
                {sending ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send Notification"
                )}
              </span>
            </button>
          </div>

          {/* Connected Clients Section */}
          <div className="rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 p-8 shadow-xl backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-400 to-indigo-400">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Connected Clients
                </h2>
                <span className="rounded-full bg-gradient-to-r from-green-400 to-emerald-400 px-3 py-1 text-sm font-bold text-white">
                  {clients.length} online
                </span>
              </div>
              {loading && (
                <button
                  onClick={fetchClients}
                  disabled={loading}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-indigo-600 disabled:scale-100 disabled:from-gray-600 disabled:to-gray-700"
                >
                  <span className="relative flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    <span>Refreshing...</span>
                  </span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-flex items-center space-x-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
                  <div className="text-lg text-white/80">
                    Loading clients...
                  </div>
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-gray-400 to-gray-500">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="text-lg font-medium text-white/80">
                  No clients connected
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Waiting for connections...
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-blue-300/20">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-blue-600/40 to-indigo-600/40 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-blue-200 uppercase">
                          Client
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-blue-200 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-blue-200 uppercase">
                          Connections
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-blue-200 uppercase">
                          Connected At
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-blue-200 uppercase">
                          Last Seen
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-blue-200 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-300/20">
                      {clients.map((client, index) => (
                        <tr
                          key={client.id}
                          className="bg-white/5 backdrop-blur-sm transition-all duration-200 hover:bg-white/10"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg">
                                  <span className="text-sm font-bold text-white">
                                    {(
                                      client.name?.trim()?.charAt(0) ?? "U"
                                    ).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-bold text-white">
                                  {client.name ?? "Unnamed Client"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-blue-200">
                            <code className="rounded-lg border border-blue-400/30 bg-blue-900/40 px-3 py-1 font-mono text-xs">
                              {client.id.slice(0, 16)}...
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-green-400 to-emerald-400 px-3 py-1 text-xs font-bold text-white shadow-lg">
                              <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-white"></div>
                              {client.connectionCount} active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-blue-200">
                            {formatTime(client.connectedAt)}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-blue-200">
                            <span className="rounded-lg border border-blue-400/20 bg-blue-900/30 px-2 py-1">
                              {getTimeSince(client.lastSeen)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            <button
                              onClick={() =>
                                setNotification((prev) => ({
                                  ...prev,
                                  clientId: client.id,
                                  broadcast: false,
                                }))
                              }
                              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-600 hover:to-pink-600"
                            >
                              <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-500 group-hover:translate-x-full"></div>
                              <span className="relative">Select</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
