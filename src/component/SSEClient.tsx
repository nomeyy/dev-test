// components/SSEClient.tsx
"use client";
import { useEffect, useState } from "react";
import { cn } from "@/features/shared/utils";
import toast from "react-hot-toast";
import NotificationModal from "@/component/NotificationModal";

type Client = {
  clientId: string;
  username: string;
};

type Props = {
  clientId: string;
  clientName: string;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export default function SSEClient({ clientId, clientName }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [open, setOpen] = useState(false);

  const [activeClient, setActiveClient] = useState<string | null>(null);

  useEffect(() => {
    const newEventSource = new EventSource(
      `/api/sse?clientId=${clientId}&username=${encodeURIComponent(clientName)}`,
    );
    setEventSource(newEventSource);

    // Connection events
    newEventSource.onopen = () => {
      setConnectionStatus("connected");
      console.log("SSE connection established");
    };

    newEventSource.onerror = (error) => {
      console.log("SSE connection error:", error);
      setConnectionStatus("error");

      // Close the current connection
      newEventSource.close();

      // Show toast notification about connection error
      toast.error(
        "Connection lost. Users will appear offline until reconnected.",
      );

      // Try reconnecting after a few seconds
      setTimeout(() => {
        const reconnectSource = new EventSource(
          `/api/sse?clientId=${clientId}&username=${encodeURIComponent(clientName)}`,
        );
        setEventSource(reconnectSource);
      }, 5000);
    };

    newEventSource.addEventListener("notification", (event) => {
      const data = JSON.parse(event.data);
      console.log("Received Notification:", data);
      toast.success(data.message); // or use toast
    });

    // Custom event listeners
    newEventSource.addEventListener("connected", (e) => {
      console.log("SSE connected:", e.data);
      setConnectionStatus("connected");
    });

    newEventSource.addEventListener("ping", () => {
      setLastPing(new Date());
      console.log("Heartbeat ping received");
    });

    newEventSource.addEventListener("custom-event", (e) => {
      const data = JSON.parse(e.data);
      console.log("Custom event received:", data);
    });

    newEventSource.addEventListener("update_clients", (e) => {
      const data = JSON.parse(e.data);
      setClients(data.clients);
    });

    return () => {
      newEventSource.close();
    };
  }, [clientId, clientName]);

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          color: "bg-green-500",
          text: "Connected",
          icon: "🟢",
        };
      case "connecting":
        return {
          color: "bg-yellow-500 animate-pulse",
          text: "Connecting...",
          icon: "🟡",
        };
      case "error":
        return {
          color: "bg-red-500",
          text: "Connection Error",
          icon: "🔴",
        };
      default:
        return {
          color: "bg-gray-500",
          text: "Disconnected",
          icon: "⚫",
        };
    }
  };

  const sendNotification = async (message: string) => {
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginUser: clientId,
          targetClientId: activeClient,
          event: "notification",
          data: {
            message: message,
            sentAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        toast.success("Notification sent");
      } else {
        toast.error("Failed to send notification");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending notification");
    }
  };

  const status = getStatusIndicator();

  // Sort clients to show current user first
  const sortedClients = clients.sort((a, b) => {
    if (a.clientId === clientId) return -1; // Current user first
    if (b.clientId === clientId) return 1;
    return a.username.localeCompare(b.username); // Then alphabetically by username
  });

  // Determine if users should be shown as online based on connection status
  const showUsersOnline =
    connectionStatus !== "error" && connectionStatus !== "disconnected";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Connection Status Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <span className="text-2xl">📡</span>
              Real-time Connection
            </h2>

            {/* Broadcast Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                setOpen(true);
                setActiveClient(null);
                console.log("Broadcast button clicked");
              }}
              className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-4 py-2 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/30"
            >
              <span className="text-lg">📢</span>
              <span className="font-medium">Broadcast</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("h-3 w-3 rounded-full", status.color)}></div>
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {status.text}
              </span>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Client ID: {clientId.slice(0, 8)}...
              </div>
              {lastPing && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Last ping: {lastPing.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Users Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div
          className={cn(
            "px-6 py-4",
            showUsersOnline
              ? "bg-gradient-to-r from-green-500 to-teal-600"
              : "bg-gradient-to-r from-gray-500 to-gray-600",
          )}
        >
          <h3 className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-2xl">👥</span>
            {showUsersOnline ? "Connected Users" : "Users (Offline)"}
            <span className="rounded-full bg-white/20 px-2 py-1 text-sm text-white">
              {clients.length}
            </span>
          </h3>
        </div>

        <div className="p-6">
          {clients.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-4 text-6xl">😴</div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                No users are currently connected
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedClients.map((client, index) => (
                <div
                  key={client.clientId}
                  className={cn(
                    "relative flex items-center justify-between rounded-lg border p-4 transition-all duration-200 hover:shadow-md",
                    client.clientId === clientId
                      ? "border-blue-200 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-800 dark:bg-blue-900/20 dark:ring-blue-800"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600",
                  )}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* User Avatar */}
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white",
                        client.clientId === clientId
                          ? "bg-gradient-to-r from-blue-500 to-purple-600"
                          : "bg-gradient-to-r from-gray-500 to-gray-600",
                      )}
                    >
                      {client.username.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                        {client.username}
                        {client.clientId === clientId && (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {client.clientId.slice(0, 12)}...
                      </div>
                    </div>
                  </div>

                  {/* Online Indicator */}
                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        showUsersOnline
                          ? "animate-pulse bg-green-500"
                          : "bg-gray-400",
                      )}
                    ></div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        showUsersOnline
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-600 dark:text-gray-400",
                      )}
                    >
                      {showUsersOnline ? "Online" : "Offline"}
                    </span>
                    {client.clientId !== clientId && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setOpen(true);
                          setActiveClient(client.clientId);
                          console.log(
                            "Message button clicked for client:",
                            client.clientId,
                          );
                        }}
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          showUsersOnline
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : "cursor-not-allowed bg-gray-300 text-gray-600",
                        )}
                        disabled={!showUsersOnline}
                      >
                        <span>💬</span>
                        {showUsersOnline ? "Message" : "Unavailable"}
                      </button>
                    )}
                  </div>

                  {/* Decorative border for current user */}
                  {client.clientId === clientId && (
                    <div className="absolute -top-1 -right-1 -bottom-1 -left-1 -z-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {clients.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Users
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {connectionStatus === "connected" ? "Active" : "Inactive"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Connection
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <span className="text-2xl">💓</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {lastPing ? "Live" : "Waiting"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Heartbeat
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSend={sendNotification}
        type={activeClient ? "personal" : "broadcast"}
        targetUser={
          activeClient
            ? clients.find((c) => c.clientId === activeClient)?.username
            : undefined
        }
      />
    </div>
  );
}
