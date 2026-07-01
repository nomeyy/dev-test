"use client";

import React, { useState, useEffect } from "react";
import { useSocket, SocketNotification } from "@/hooks/useSocket";
import { Bell, X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface NotificationItem extends SocketNotification {
  id: string;
  read: boolean;
  dismissed: boolean;
}

interface RealTimeNotificationsProps {
  maxNotifications?: number;
  autoDismiss?: boolean;
  dismissDelay?: number;
  showConnectionStatus?: boolean;
  className?: string;
}

const notificationIcons = {
  "user:welcome": CheckCircle,
  "user:profile_updated": Info,
  "message:received": Bell,
  "system:maintenance": AlertCircle,
  "system:error": XCircle,
  "content:uploaded": CheckCircle,
  "content:processed": Info,
  "content:approved": CheckCircle,
  "content:rejected": XCircle,
  "realtime:update": Info,
  "webhook:received": Bell,
  "webhook:processed": CheckCircle,
};

const notificationColors = {
  "user:welcome": "bg-green-50 border-green-200 text-green-800",
  "user:profile_updated": "bg-blue-50 border-blue-200 text-blue-800",
  "message:received": "bg-purple-50 border-purple-200 text-purple-800",
  "system:maintenance": "bg-yellow-50 border-yellow-200 text-yellow-800",
  "system:error": "bg-red-50 border-red-200 text-red-800",
  "content:uploaded": "bg-green-50 border-green-200 text-green-800",
  "content:processed": "bg-blue-50 border-blue-200 text-blue-800",
  "content:approved": "bg-green-50 border-green-200 text-green-800",
  "content:rejected": "bg-red-50 border-red-200 text-red-800",
  "realtime:update": "bg-blue-50 border-blue-200 text-blue-800",
  "webhook:received": "bg-purple-50 border-purple-200 text-purple-800",
  "webhook:processed": "bg-green-50 border-green-200 text-green-800",
};

export function RealTimeNotifications({
  maxNotifications = 10,
  autoDismiss = true,
  dismissDelay = 5000,
  showConnectionStatus = true,
  className = "",
}: RealTimeNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    isConnected,
    isConnecting,
    connection,
    onNotification,
    onConnect,
    onDisconnect,
    onError,
  } = useSocket({
    onNotification: (notification: SocketNotification) => {
      const newNotification: NotificationItem = {
        ...notification,
        id: `${notification.type}-${Date.now()}-${Math.random()}`,
        read: false,
        dismissed: false,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, maxNotifications);
        return updated;
      });

      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      const Icon =
        notificationIcons[
          notification.type as keyof typeof notificationIcons
        ] || Info;
      toast.custom(
        (t) => (
          <div
            className={`${t.visible ? "animate-enter" : "animate-leave"} ring-opacity-5 pointer-events-auto flex w-full max-w-md rounded-lg bg-white shadow-lg ring-1 ring-black`}
          >
            <div className="w-0 flex-1 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.type}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {typeof notification.data === "string"
                      ? notification.data
                      : notification.data?.message ||
                        JSON.stringify(notification.data)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex w-full items-center justify-center rounded-none rounded-r-lg border border-transparent p-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ),
        {
          duration: dismissDelay,
        },
      );

      // Auto-dismiss notification
      if (autoDismiss) {
        setTimeout(() => {
          dismissNotification(newNotification.id);
        }, dismissDelay);
      }
    },
    onConnect: (connection) => {
      console.log("Connected to real-time notifications:", connection);
      if (showConnectionStatus) {
        toast.success("Connected to real-time notifications");
      }
    },
    onDisconnect: (reason) => {
      console.log("Disconnected from real-time notifications:", reason);
      if (showConnectionStatus) {
        toast.error("Disconnected from real-time notifications");
      }
    },
    onError: (error) => {
      console.error("Socket error:", error);
      if (showConnectionStatus) {
        toast.error("Connection error");
      }
    },
  });

  const dismissNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, dismissed: true }
          : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const visibleNotifications = notifications.filter((n) => !n.dismissed);

  return (
    <div className={`relative ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="absolute -top-2 -right-2 z-10">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected
                ? "bg-green-500"
                : isConnecting
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
        </div>
      )}

      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-md p-2 text-gray-600 hover:text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="ring-opacity-5 absolute right-0 z-50 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black">
          <div className="py-1">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <h3 className="text-sm font-medium text-gray-900">
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <span className="text-xs text-gray-500">
                    {unreadCount} unread
                  </span>
                )}
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                visibleNotifications.map((notification) => {
                  const Icon =
                    notificationIcons[
                      notification.type as keyof typeof notificationIcons
                    ] || Info;
                  const colorClass =
                    notificationColors[
                      notification.type as keyof typeof notificationColors
                    ] || "bg-gray-50 border-gray-200 text-gray-800";

                  return (
                    <div
                      key={notification.id}
                      className={`border-l-4 px-4 py-3 ${colorClass} ${
                        !notification.read ? "border-l-4 border-l-blue-500" : ""
                      } transition-colors hover:bg-gray-50`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-1 items-start space-x-3">
                          <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.type
                                .replace(/[:_]/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {typeof notification.data === "string"
                                ? notification.data
                                : notification.data?.message ||
                                  JSON.stringify(notification.data)}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(
                                notification.timestamp,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => dismissNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {connection && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Connected as: {connection.socketId.slice(0, 8)}...
                  </span>
                  <span>{connection.totalConnections} total connections</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
