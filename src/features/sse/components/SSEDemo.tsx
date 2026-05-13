/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  useSSE,
  useSSENotifications,
  SSEConnectionState,
} from "../hooks/useSSE";
import { api } from "@/trpc/react";

/**
 * Connection status indicator component
 */
function ConnectionStatus({ state }: { state: SSEConnectionState }) {
  const getStatusColor = () => {
    switch (state) {
      case SSEConnectionState.CONNECTED:
        return "bg-green-500";
      case SSEConnectionState.CONNECTING:
      case SSEConnectionState.RECONNECTING:
        return "bg-yellow-500";
      case SSEConnectionState.ERROR:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (state) {
      case SSEConnectionState.CONNECTED:
        return "Connected";
      case SSEConnectionState.CONNECTING:
        return "Connecting...";
      case SSEConnectionState.RECONNECTING:
        return "Reconnecting...";
      case SSEConnectionState.ERROR:
        return "Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
}

/**
 * Notification display component
 */
function NotificationList({
  notifications,
  onClear,
}: {
  notifications: Array<{
    title: string;
    message: string;
    severity: "info" | "warning" | "error" | "success";
    timestamp: number;
  }>;
  onClear: () => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No notifications yet. Try sending some!
      </div>
    );
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "success":
        return "border-green-500 bg-green-50 text-green-800";
      case "error":
        return "border-red-500 bg-red-50 text-red-800";
      case "warning":
        return "border-yellow-500 bg-yellow-50 text-yellow-800";
      default:
        return "border-blue-500 bg-blue-50 text-blue-800";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Recent Notifications</h4>
        <Button variant="destructive" size="sm" onClick={onClear}>
          Clear All
        </Button>
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.timestamp}
            className={`rounded-r border-l-4 p-3 ${getSeverityStyles(notification.severity)}`}
          >
            <div className="text-sm font-semibold">{notification.title}</div>
            <div className="text-xs opacity-90">{notification.message}</div>
            <div className="mt-1 text-xs opacity-70">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Statistics card component
 */
function StatCard({
  title,
  value,
  color = "text-blue-400",
}: {
  title: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-sm text-gray-300">{title}</div>
    </div>
  );
}

export default function SSEDemo() {
  const sse = useSSE({ debug: true });
  const { notifications, clearNotifications } = useSSENotifications();
  const [lastCustomEvent, setLastCustomEvent] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<any>(null);

  // mutations
  const sendNotificationMutation = api.sse.sendDemoNotification.useMutation();
  const pingMutation = api.sse.ping.useMutation();
  const simulateUploadMutation = api.sse.simulateUploadProgress.useMutation();
  const broadcastAlertMutation = api.sse.broadcastAlert.useMutation();
  const statsQuery = api.sse.getStats.useQuery(undefined, {
    refetchInterval: 60000, // 60 seconds
  });

  // Listen for custom events
  useEffect(() => {
    const unsubscribe = sse.addEventListener("ping", (event) => {
      setLastCustomEvent({
        type: "ping",
        data: event.data,
        timestamp: Date.now(),
      });
    });

    return unsubscribe;
  }, [sse]);

  // Listen for upload progress
  useEffect(() => {
    const unsubscribe = sse.addEventListener("upload_progress", (event) => {
      setUploadProgress(event.data);
    });

    const unsubscribeComplete = sse.addEventListener("upload_complete", () => {
      setTimeout(() => setUploadProgress(null), 3000);
    });

    return () => {
      unsubscribe();
      unsubscribeComplete();
    };
  }, [sse]);

  const handleSendDemoNotification = async () => {
    try {
      await sendNotificationMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to send demo notification:", error);
    }
  };

  const handlePing = async () => {
    try {
      await pingMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to send ping:", error);
    }
  };

  const handleSimulateUpload = async () => {
    try {
      await simulateUploadMutation.mutateAsync({
        duration: 8000, // 8 seconds
      });
    } catch (error) {
      console.error("Failed to simulate upload:", error);
    }
  };

  const handleBroadcastAlert = async () => {
    try {
      await broadcastAlertMutation.mutateAsync({
        title: "System Alert",
        message: "This is a test system-wide alert!",
        severity: "warning",
      });
    } catch (error) {
      console.error("Failed to broadcast alert:", error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-extrabold text-white">
          SSE <span className="text-[hsl(280,100%,70%)]">Real-time</span> Demo
        </h1>
        <p className="text-lg text-gray-300">
          Test the Server-Sent Events implementation with live notifications and
          updates
        </p>
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Connection Status
        </h2>
        <div className="space-y-3">
          <ConnectionStatus state={sse.connectionState} />
          {sse.error && (
            <div className="rounded border border-red-500/20 bg-red-900/20 p-2 text-sm text-red-400">
              Error: {sse.error}
            </div>
          )}
          <div className="text-sm text-gray-300">
            Events received:{" "}
            <span className="font-mono text-green-400">
              {sse.stats.eventsReceived}
            </span>
          </div>
          {sse.stats.connectionTime && (
            <div className="text-sm text-gray-300">
              Connected since:{" "}
              <span className="font-mono text-blue-400">
                {sse.stats.connectionTime.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            onClick={sse.connect}
            disabled={sse.connectionState === SSEConnectionState.CONNECTED}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Connect
          </Button>
          <Button
            onClick={sse.disconnect}
            disabled={sse.connectionState === SSEConnectionState.DISCONNECTED}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">Test Actions</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Button
            onClick={handleSendDemoNotification}
            disabled={sendNotificationMutation.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {sendNotificationMutation.isPending
              ? "Sending..."
              : "Demo Notification"}
          </Button>

          <Button
            onClick={handlePing}
            disabled={pingMutation.isPending}
            className="border-white/20 text-white hover:bg-white/10"
          >
            {pingMutation.isPending ? "Pinging..." : "Ping Test"}
          </Button>

          <Button
            onClick={handleSimulateUpload}
            disabled={simulateUploadMutation.isPending}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {simulateUploadMutation.isPending
              ? "Starting..."
              : "Simulate Upload"}
          </Button>

          <Button
            onClick={handleBroadcastAlert}
            disabled={broadcastAlertMutation.isPending}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {broadcastAlertMutation.isPending
              ? "Sending..."
              : "Broadcast Alert"}
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">
            Upload Progress
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                Status:{" "}
                <span className="text-purple-400">{uploadProgress.status}</span>
              </span>
              <span className="font-mono text-sm text-green-400">
                {uploadProgress.progress}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700/50">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <div className="text-sm text-gray-300">
              {uploadProgress.message}
            </div>
            <div className="font-mono text-xs text-gray-400">
              Upload ID: {uploadProgress.uploadId}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Connection Statistics
        </h2>
        {statsQuery.data ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              title="Total Connections"
              value={statsQuery.data.totalConnections}
              color="text-blue-400"
            />
            <StatCard
              title="Unique Users"
              value={statsQuery.data.uniqueUsers}
              color="text-green-400"
            />
            <StatCard
              title="Your Connections"
              value={statsQuery.data.currentUserConnections}
              color="text-purple-400"
            />
            <StatCard
              title="Events Received"
              value={sse.stats.eventsReceived}
              color="text-orange-400"
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-300">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
            Loading stats...
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Real-time Notifications
        </h2>
        <NotificationList
          notifications={notifications}
          onClear={clearNotifications}
        />
      </div>

      {/* Custom Events */}
      {lastCustomEvent && (
        <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">
            Last Custom Event
          </h2>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
            <div className="text-sm font-medium text-white">
              Type:{" "}
              <span className="font-mono text-cyan-400">
                {lastCustomEvent.type}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Received:{" "}
              <span className="font-mono">
                {new Date(
                  lastCustomEvent.timestamp as unknown as string,
                ).toLocaleTimeString()}
              </span>
            </div>
            <div className="mt-3">
              <div className="mb-1 text-xs text-gray-300">Event Data:</div>
              <pre className="overflow-x-auto rounded border border-white/10 bg-black/30 p-2 font-mono text-xs text-green-300">
                {JSON.stringify(lastCustomEvent.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Debug Information
        </h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="text-gray-300">
            Connection State:{" "}
            <span className="text-cyan-400">{sse.connectionState}</span>
          </div>
          <div className="text-gray-300">
            Reconnect Attempts:{" "}
            <span className="text-yellow-400">
              {sse.stats.reconnectAttempts}
            </span>
          </div>
          {sse.lastEvent && (
            <div className="text-gray-300">
              Last Event:{" "}
              <span className="text-green-400">{sse.lastEvent.type}</span> at{" "}
              <span className="text-blue-400">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          )}
          {sse.error && (
            <div className="rounded border border-red-500/20 bg-red-900/20 p-2 text-red-400">
              Error: {sse.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
