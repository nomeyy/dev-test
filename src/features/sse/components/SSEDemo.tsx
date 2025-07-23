"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { useSSE } from "../hooks/useSSE";

export function SSEDemo() {
  const {
    isConnected,
    connectionId,
    lastEvent,
    error,
    reconnectCount,
    connect,
    disconnect,
  } = useSSE();
  const [events, setEvents] = useState<any[]>([]);

  // Update events list when new event arrives
  useEffect(() => {
    if (lastEvent) {
      setEvents((prev) => [lastEvent, ...prev].slice(0, 10)); // Keep last 10 events
    }
  }, [lastEvent]);

  const sendTestNotification = useCallback(async () => {
    if (!connectionId) return;

    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test_notification",
          message: "This is a test notification!",
          connectionId,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  }, [connectionId]);

  const sendTestDataUpdate = useCallback(async () => {
    if (!connectionId) return;

    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "data_update",
          dataType: "user_stats",
          data: {
            users: Math.floor(Math.random() * 1000),
            sessions: Math.floor(Math.random() * 500),
          },
          connectionId,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test data update");
      }
    } catch (error) {
      console.error("Error sending test data update:", error);
    }
  }, [connectionId]);

  const sendBroadcastNotification = useCallback(async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast_notification",
          message: "🔊 This notification goes to ALL tabs and users!",
        }),
      });

      if (!response.ok) {
        console.error("Failed to send broadcast notification");
      }
    } catch (error) {
      console.error("Error sending broadcast notification:", error);
    }
  }, []);

  const sendBroadcastDataUpdate = useCallback(async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast_data_update",
          dataType: "global_stats",
          data: {
            totalUsers: Math.floor(Math.random() * 10000),
            activeConnections: Math.floor(Math.random() * 500),
            serverLoad: Math.floor(Math.random() * 100),
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send broadcast data update");
      }
    } catch (error) {
      console.error("Error sending broadcast data update:", error);
    }
  }, []);

  const sendSystemAnnouncement = useCallback(async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast_system",
          message:
            "📢 Scheduled maintenance in 10 minutes. Please save your work!",
        }),
      });

      if (!response.ok) {
        console.error("Failed to send system announcement");
      }
    } catch (error) {
      console.error("Error sending system announcement:", error);
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-border bg-card rounded-lg border p-6">
        <h2 className="text-card-foreground mb-4 text-2xl font-bold">
          SSE Connection Demo
        </h2>

        {/* Connection Status */}
        <div className="mb-4 flex items-center gap-4">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span
            className={`font-medium ${isConnected ? "text-green-400" : "text-red-400"}`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {connectionId && (
            <span className="text-muted-foreground text-sm">
              ID: {connectionId.slice(0, 8)}...
            </span>
          )}
          {reconnectCount > 0 && (
            <span className="text-sm text-orange-400">
              Reconnects: {reconnectCount}
            </span>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mb-6 space-y-4">
          {/* Connection Controls */}
          <div className="flex gap-2">
            <Button
              onClick={connect}
              disabled={isConnected || !connectionId}
              variant="default"
            >
              Connect
            </Button>
            <Button
              onClick={disconnect}
              disabled={!isConnected}
              variant="secondary"
            >
              Disconnect
            </Button>
          </div>

          {/* Single Connection Tests */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-semibold">
              📱 Single Tab Tests (This Tab Only)
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={sendTestNotification}
                disabled={!isConnected || !connectionId}
                variant="secondary"
                size="sm"
              >
                Send Test Notification
              </Button>
              <Button
                onClick={sendTestDataUpdate}
                disabled={!isConnected || !connectionId}
                variant="secondary"
                size="sm"
              >
                Send Test Data Update
              </Button>
            </div>
          </div>

          {/* Broadcast Tests */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-semibold">
              🌍 Broadcast Tests (ALL Tabs & Users)
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={sendBroadcastNotification}
                disabled={!isConnected}
                variant="destructive"
                size="sm"
              >
                🔊 Broadcast Notification
              </Button>
              <Button
                onClick={sendBroadcastDataUpdate}
                disabled={!isConnected}
                variant="destructive"
                size="sm"
              >
                📊 Broadcast Data Update
              </Button>
              <Button
                onClick={sendSystemAnnouncement}
                disabled={!isConnected}
                variant="destructive"
                size="sm"
              >
                📢 System Announcement
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              💡 Open this page in multiple tabs/windows to see broadcast in
              action!
            </p>
          </div>
        </div>

        {/* Latest Event Display */}
        {lastEvent && (
          <div className="mb-4 rounded-md border border-blue-500/20 bg-blue-500/10 p-4">
            <h3 className="mb-2 font-semibold text-blue-400">Latest Event:</h3>
            <div className="text-card-foreground text-sm">
              <div>
                <strong>Type:</strong> {lastEvent.type}
              </div>
              <div>
                <strong>Timestamp:</strong>{" "}
                {new Date(
                  (lastEvent.data.timestamp as number) || Date.now(),
                ).toLocaleTimeString()}
              </div>
              {lastEvent.data && (
                <div className="mt-2">
                  <strong>Data:</strong>
                  <pre className="bg-muted text-muted-foreground mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                    {JSON.stringify(lastEvent.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events History */}
        <div className="space-y-4">
          <h3 className="text-card-foreground text-lg font-semibold">
            Recent Events (Last 10)
          </h3>
          <div className="max-h-96 space-y-2 overflow-auto">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No events received yet. Connect and send some test events!
              </p>
            ) : (
              events.map((event, index) => (
                <div
                  key={`${(event.data.timestamp as number) || Date.now()}-${index}`}
                  className="border-border bg-muted/50 rounded-md border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-card-foreground text-sm font-medium">
                      {event.type}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(
                        (event.data.timestamp as number) || Date.now(),
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.data && (
                    <pre className="text-muted-foreground mt-2 max-h-20 overflow-auto text-xs">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SSEDemo;
