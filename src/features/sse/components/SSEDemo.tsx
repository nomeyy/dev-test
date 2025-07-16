"use client";

import { useState, useCallback } from "react";
import { useSSE } from "../hooks/useSSE";
import { Button } from "@/shared/components/ui/button";

interface Notification {
  id: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface UploadProgress {
  uploadId: string;
  progress: number;
  status: string;
  timestamp: number;
}

interface AssetReady {
  assetId: string;
  assetUrl: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Demo component showing SSE usage
 * Demonstrates how to connect to SSE stream and handle different event types
 */
export function SSEDemo({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, UploadProgress>
  >({});
  const [assets, setAssets] = useState<AssetReady[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");

  // Memoize callback functions to prevent infinite re-renders
  const handleOpen = useCallback(() => setConnectionStatus("Connected"), []);
  const handleError = useCallback(() => setConnectionStatus("Error"), []);
  const handleClose = useCallback(
    () => setConnectionStatus("Disconnected"),
    [],
  );

  const handleNotification = useCallback((data: any) => {
    const notification: Notification = {
      id: Date.now().toString(),
      message: data.message,
      timestamp: data.timestamp,
      data: data,
    };
    setNotifications((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10
  }, []);

  const handleUploadProgress = useCallback((data: any) => {
    setUploadProgress((prev) => ({
      ...prev,
      [data.uploadId]: data,
    }));
  }, []);

  const handleAssetReady = useCallback((data: any) => {
    const asset: AssetReady = {
      assetId: data.assetId,
      assetUrl: data.assetUrl,
      metadata: data.metadata,
      timestamp: data.timestamp,
    };
    setAssets((prev) => [asset, ...prev.slice(0, 9)]); // Keep last 10
  }, []);

  const handleHeartbeat = useCallback(() => {
    // Optional: Update last heartbeat time
    console.log("Heartbeat received");
  }, []);

  const {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    connect,
    disconnect,
  } = useSSE({
    userId,
    onOpen: handleOpen,
    onError: handleError,
    onClose: handleClose,
    onNotification: handleNotification,
    onUploadProgress: handleUploadProgress,
    onAssetReady: handleAssetReady,
    onHeartbeat: handleHeartbeat,
  });

  const clearNotifications = () => setNotifications([]);
  const clearUploads = () => setUploadProgress({});
  const clearAssets = () => setAssets([]);

  // Test event functions
  const sendTestNotification = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "notification",
          data: {
            message: "Test notification from demo",
            timestamp: Date.now(),
            userId: userId,
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  const sendTestUploadProgress = async () => {
    try {
      const uploadId = `test-upload-${Date.now()}`;
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "upload_progress",
          data: {
            uploadId,
            progress: Math.floor(Math.random() * 100),
            status: "uploading",
            timestamp: Date.now(),
            userId: userId,
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test upload progress");
      }
    } catch (error) {
      console.error("Error sending test upload progress:", error);
    }
  };

  const sendTestAssetReady = async () => {
    try {
      const assetId = `test-asset-${Date.now()}`;
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "asset_ready",
          data: {
            assetId,
            assetUrl: "https://example.com/test-video.mp4",
            metadata: {
              duration: 120,
              format: "mp4",
              size: "50MB",
            },
            timestamp: Date.now(),
            userId: userId,
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test asset ready");
      }
    } catch (error) {
      console.error("Error sending test asset ready:", error);
    }
  };

  const sendTestUserUpdate = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_update",
          data: {
            userId: userId,
            updates: {
              profile: "updated",
              preferences: "modified",
            },
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        console.error("Failed to send test user update");
      }
    } catch (error) {
      console.error("Error sending test user update:", error);
    }
  };

  const sendAllTestEvents = async () => {
    try {
      // Send all test events in sequence with small delays
      await sendTestNotification();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await sendTestUploadProgress();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await sendTestAssetReady();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await sendTestUserUpdate();
    } catch (error) {
      console.error("Error sending all test events:", error);
    }
  };

  const testConnection = async () => {
    try {
      console.log("Sending test connection message...");
      console.log("Current SSE state:", {
        isConnected,
        isConnecting,
        error,
        reconnectAttempts,
      });
      console.log("Current userId:", userId);

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "notification",
          data: {
            message: "Test connection message",
            timestamp: Date.now(),
            userId: userId,
          },
        }),
      });
      console.log("🚀 ~ testConnection ~ response:", response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send test connection message:", errorText);
        alert(`Failed to send test message: ${errorText}`);
      } else {
        const result = await response.json();
        console.log("Test connection message sent successfully:", result);
        alert(
          "Test message sent successfully! Check the notifications section.",
        );
      }
    } catch (error) {
      alert(
        `Error sending test connection message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      console.error("Error sending test connection message:", error);
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-gray-900 p-6 text-white">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">SSE Demo</h2>

        {/* Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected
                  ? "bg-green-500"
                  : isConnecting
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium">
              {connectionStatus}
              {reconnectAttempts > 0 && ` (Reconnect: ${reconnectAttempts})`}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={connect}
              disabled={isConnected || isConnecting}
              className="bg-gray-800 text-white hover:bg-gray-700"
            >
              Connect
            </Button>
            <Button
              size="sm"
              onClick={disconnect}
              disabled={!isConnected}
              className="bg-gray-600 text-white hover:bg-gray-500"
            >
              Disconnect
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-red-700">
            <p className="text-sm font-medium">Connection Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Test Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Test Events</h3>
          <span className="text-sm text-gray-400">
            Send test events to see real-time updates
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Button
            size="sm"
            onClick={sendTestNotification}
            disabled={!isConnected}
            className="flex flex-col items-center gap-1 bg-gray-800 p-3 text-white hover:bg-gray-700"
          >
            <span className="text-xs font-medium">Notification</span>
            {/* <span className="text-xs text-gray-300">
              Send test notification
            </span> */}
          </Button>

          <Button
            size="sm"
            onClick={sendTestUploadProgress}
            disabled={!isConnected}
            className="flex flex-col items-center gap-1 bg-gray-800 p-3 text-white hover:bg-gray-700"
          >
            <span className="text-xs font-medium">Upload Progress</span>
            {/* <span className="text-xs text-gray-300">
              Simulate upload progress
            </span> */}
          </Button>

          <Button
            size="sm"
            onClick={sendTestAssetReady}
            disabled={!isConnected}
            className="flex flex-col items-center gap-1 bg-gray-800 p-3 text-white hover:bg-gray-700"
          >
            <span className="text-xs font-medium">Asset Ready</span>
            {/* <span className="text-xs text-gray-300">Simulate asset ready</span> */}
          </Button>

          <Button
            size="sm"
            onClick={sendTestUserUpdate}
            disabled={!isConnected}
            className="flex flex-col items-center gap-1 bg-gray-800 p-3 text-white hover:bg-gray-700"
          >
            <span className="text-xs font-medium">User Update</span>
            {/* <span className="text-xs text-gray-300">Simulate user update</span> */}
          </Button>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            onClick={testConnection}
            disabled={!isConnected}
            className="bg-gray-700 text-white hover:bg-gray-600"
          >
            Test Connection
          </Button>
          <Button
            size="sm"
            onClick={sendAllTestEvents}
            disabled={!isConnected}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            Send All Test Events
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              console.log("SSE Connection Status:", {
                isConnected,
                isConnecting,
                error,
                reconnectAttempts,
                userId,
              });

              try {
                const response = await fetch("/api/sse/debug");
                const data = await response.json();
                console.log("SSE Debug Info:", data);
              } catch (error) {
                console.error("Failed to get SSE debug info:", error);
              }
            }}
            className="bg-gray-600 text-white hover:bg-gray-500"
          >
            Debug Status
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <Button
            size="sm"
            onClick={clearNotifications}
            className="bg-gray-700 text-white hover:bg-gray-600"
          >
            Clear
          </Button>
        </div>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400">No notifications received</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-md border border-blue-700/30 bg-blue-900/20 p-3 text-sm"
              >
                <p className="font-medium text-white">{notification.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Upload Progress</h3>
          <Button
            size="sm"
            onClick={clearUploads}
            className="bg-gray-700 text-white hover:bg-gray-600"
          >
            Clear
          </Button>
        </div>
        <div className="space-y-2">
          {Object.keys(uploadProgress).length === 0 ? (
            <p className="text-sm text-gray-400">No uploads in progress</p>
          ) : (
            Object.values(uploadProgress).map((upload) => (
              <div
                key={upload.uploadId}
                className="rounded-md border border-gray-700/30 bg-gray-800/50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    Upload {upload.uploadId}
                  </span>
                  <span className="text-xs text-gray-400">{upload.status}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progress</span>
                    <span>{upload.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assets Ready */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Assets Ready</h3>
          <Button
            size="sm"
            onClick={clearAssets}
            className="bg-gray-700 text-white hover:bg-gray-600"
          >
            Clear
          </Button>
        </div>
        <div className="space-y-2">
          {assets.length === 0 ? (
            <p className="text-sm text-gray-400">No assets ready</p>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.assetId}
                className="rounded-md border border-green-700/30 bg-green-900/20 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    Asset {asset.assetId}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(asset.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-300">{asset.assetUrl}</p>
                {asset.metadata && (
                  <p className="mt-1 text-xs text-gray-400">
                    {JSON.stringify(asset.metadata)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
