"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  Bell,
  AlertTriangle,
  MessageSquare,
  Users,
  Target,
  Send,
  Trash2,
  Activity,
  Clock,
  User,
  Settings,
  BarChart3,
} from "lucide-react";

interface EventLog {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  clientId?: string;
}

export default function SSENotificationSystem() {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | undefined>();
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | undefined>();
  const [events, setEvents] = useState<EventLog[]>([]);
  const [targetType, setTargetType] = useState<"broadcast" | "specific">(
    "broadcast",
  );
  const [targetId, setTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [connectedClients, setConnectedClients] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addEvent = (type: string, data: any, clientId?: string) => {
    const newEvent: EventLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      clientId,
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
  };

  const connect = () => {
    try {
      const eventSource = new EventSource("/api/sse");

      eventSource.onopen = () => {
        setIsConnected(true);
        addEvent("connected", { message: "SSE connection established" });
      };

      eventSource.addEventListener("notification", (event) => {
        const data = JSON.parse(event.data);
        addEvent("notification", data);
      });

      eventSource.addEventListener("update", (event) => {
        const data = JSON.parse(event.data);
        addEvent("update", data);
      });

      eventSource.addEventListener("alert", (event) => {
        const data = JSON.parse(event.data);
        addEvent("alert", data);
      });

      eventSource.addEventListener("ping", (event) => {
        const data = JSON.parse(event.data);
        addEvent("ping", data);
        setLastHeartbeat(new Date());
      });

      eventSource.addEventListener("connected", (event) => {
        const data = JSON.parse(event.data);
        if (data?.clientId) {
          setClientId(data.clientId);
          addEvent("connected", data, data.clientId);

          // Add this client to the connected clients list
          setConnectedClients((prev) => {
            if (!prev.includes(data.clientId)) {
              return [...prev, data.clientId];
            }
            return prev;
          });
        }
      });

      eventSource.onerror = (error) => {
        setIsConnected(false);
        addEvent("error", { message: "Connection error", error: error.type });
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      addEvent("error", { message: "Failed to create connection", error });
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsConnected(false);
      addEvent("disconnected", { message: "Connection closed" });
      clearEvents();
    }
  };

  const reconnect = () => {
    disconnect();
    setTimeout(connect, 1000);
  };

  const sendEvent = async (eventType: string, customData?: any) => {
    try {
      const eventData = customData || {
        message: message || `Test ${eventType} event`,
        timestamp: new Date().toISOString(),
      };

      const body: any = {
        event: eventType,
        data: eventData,
      };

      if (targetType === "broadcast") {
        // Send to all clients
        body.broadcast = true;
      } else if (targetType === "specific" && targetId) {
        // Send to specific client
        body.clientId = targetId;
      } else if (targetType === "specific" && !targetId) {
        // No target selected for specific client
        addEvent("error", { message: "Please select a target client" });
        return;
      }

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to send event");

      addEvent("sent", {
        eventType,
        data: eventData,
        target: targetType === "broadcast" ? "all" : targetId,
      });
    } catch (error) {
      addEvent("error", { message: "Failed to send event", error });
    }
  };

  const sendPing = async () => {
    try {
      const pingData = {
        message: message || "Manual ping",
        timestamp: new Date().toISOString(),
      };

      const body: any = {
        event: "ping",
        data: pingData,
      };

      if (targetType === "broadcast") {
        // Send to all clients
        body.broadcast = true;
      } else if (targetType === "specific" && targetId) {
        // Send to specific client
        body.clientId = targetId;
      } else if (targetType === "specific" && !targetId) {
        // No target selected for specific client
        addEvent("error", {
          message: "Please select a target client for ping",
        });
        return;
      }

      const response = await fetch("/api/sse/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to send ping");

      addEvent("ping-sent", {
        message: "Manual ping sent",
        target: targetType === "broadcast" ? "all" : targetId,
      });
    } catch (error) {
      addEvent("error", { message: "Failed to send ping", error });
    }
  };

  const getStats = async () => {
    try {
      const response = await fetch("/api/sse/status");
      const result = await response.json();
      setStats(result.stats);

      // Update connected clients list for dropdown
      if (result.stats?.clients) {
        const clientIds = result.stats.clients.map((client: any) => client.id);
        setConnectedClients(clientIds);
      }
    } catch (error) {
      addEvent("error", { message: "Failed to get stats", error });
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(getStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-8 w-8 text-blue-400" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    SSE Notification System
                  </h1>
                  <p className="text-slate-300">
                    Real-time Server-Sent Events demonstration and testing
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center space-x-2 rounded-full px-3 py-2 ${
                  isConnected
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
                />
                <span className="text-sm font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <button
                onClick={reconnect}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reconnect</span>
              </button>

              <button
                onClick={disconnect}
                className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                <Power className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Connection Details */}
          <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">
                Connection Details
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Client ID:</span>
                <span className="font-mono text-sm text-blue-400">
                  {clientId || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Last Heartbeat:</span>
                <span className="text-sm text-slate-300">
                  {lastHeartbeat ? lastHeartbeat.toLocaleTimeString() : "N/A"}
                </span>
              </div>

              {stats && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Clients:</span>
                    <span className="font-semibold text-green-400">
                      {stats.totalClients}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Unique Users:</span>
                    <span className="text-blue-400">{stats.uniqueUsers}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Event Controls */}
          <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">
                Event Controls
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">
                  Targeting Mode:
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    targetType === "broadcast"
                      ? "border border-blue-500/30 bg-blue-500/20 text-blue-400"
                      : "border border-purple-500/30 bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {targetType === "broadcast"
                    ? "Broadcast to All"
                    : "Specific Client"}
                </span>
              </div>

              <button
                onClick={() => sendEvent("notification")}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-3 text-white transition-colors hover:bg-green-700"
              >
                <Bell className="h-4 w-4" />
                <span>Send Test Notification</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Target
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => {
                      setTargetType(e.target.value as "broadcast" | "specific");
                      if (e.target.value === "broadcast") {
                        setTargetId(""); // Clear target ID when switching to broadcast
                      }
                    }}
                    className="w-full rounded-lg border border-white/20 bg-[#531e7f] px-3 py-2 text-white"
                  >
                    <option value="broadcast">Broadcast</option>
                    <option value="specific">Specific Client</option>
                  </select>
                </div>

                {targetType === "specific" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Target ID ({connectedClients.length} clients)
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-[#531e7f] px-3 py-2 text-white"
                    >
                      <option value="" className="bg-[#531e7f]">
                        Select a client ({connectedClients.length} available)
                      </option>
                      {connectedClients.map((client) => (
                        <option
                          key={client}
                          value={client}
                          className="bg-black/30"
                        >
                          {client === clientId ? `${client} (Current)` : client}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Message
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter message..."
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-400"
                  />
                  <button
                    onClick={() => sendEvent("notification")}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">
                Quick Actions
              </h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => sendEvent("update")}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Send Update</span>
              </button>

              <button
                onClick={() => sendEvent("alert")}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Send Alert</span>
              </button>

              <button
                onClick={sendPing}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700"
              >
                <Activity className="h-4 w-4" />
                <span>Send Ping</span>
              </button>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-400" />
              <h2 className="text-xl font-semibold text-white">
                Event Log ({events.length})
              </h2>
            </div>

            <button
              onClick={clearEvents}
              className="flex items-center space-x-2 rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <p className="py-8 text-center text-slate-400">
                No events received yet...
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-lg border p-4 ${
                    event.type === "ping"
                      ? "border-blue-500/30 bg-blue-500/20"
                      : event.type === "notification"
                        ? "border-green-500/30 bg-green-500/20"
                        : event.type === "alert"
                          ? "border-yellow-500/30 bg-yellow-500/20"
                          : event.type === "update"
                            ? "border-purple-500/30 bg-purple-500/20"
                            : event.type === "error"
                              ? "border-red-500/30 bg-red-500/20"
                              : "border-slate-500/30 bg-slate-500/20"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white capitalize">
                        {event.type}
                      </span>
                      {event.clientId && (
                        <span className="text-xs text-slate-400">
                          ({event.clientId})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  <pre className="overflow-x-auto text-xs text-slate-300">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
