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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdate || "Loading..."}
            </div>
          </div>

          {/* Send Notification Section */}
          <div className="mb-6 rounded-lg bg-blue-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Send Notification
            </h2>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="notification"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name ?? "Unnamed"} ({client.id.slice(0, 12)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notification.broadcast}
                  onChange={(e) =>
                    setNotification((prev) => ({
                      ...prev,
                      broadcast: e.target.checked,
                    }))
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Broadcast to all clients
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
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
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter your notification message..."
              />
            </div>

            <button
              onClick={sendNotification}
              disabled={sending}
              className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
            >
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>

          {/* Connected Clients Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                Connected Clients
              </h2>
              <button
                onClick={fetchClients}
                disabled={loading}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:bg-gray-400"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center">
                <div className="text-gray-500">Loading clients...</div>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-gray-500">No clients connected</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Connections
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Connected At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Last Seen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                                <span className="text-sm font-medium text-white">
                                  {(
                                    client.name?.trim()?.charAt(0) ?? "U"
                                  ).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {client.name ?? "Unnamed Client"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                            {client.id.slice(0, 16)}...
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            {client.connectionCount} active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {formatTime(client.connectedAt)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {getTimeSince(client.lastSeen)}
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
                            className="mr-3 text-blue-600 hover:text-blue-900"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
