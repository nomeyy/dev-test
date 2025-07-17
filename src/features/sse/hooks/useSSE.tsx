"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SSEEvent } from "../types";

interface UseSSEOptions {
  clientId?: string;
  sessionId?: string;
  onConnect?: (clientId: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

interface UseSSEReturn {
  isConnected: boolean;
  clientId: string | null;
  lastMessage: SSEEvent | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    clientId: providedClientId,
    sessionId,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    reconnectInterval = 5000, // 5 seconds base interval
    maxReconnectAttempts = 5,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<SSEEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReconnectTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    // Prevent rapid reconnection attempts
    const now = Date.now();
    const timeSinceLastReconnect = now - lastReconnectTimeRef.current;
    const minReconnectInterval = 1000; // Minimum 1 second between attempts

    if (timeSinceLastReconnect < minReconnectInterval) {
      console.log("SSE: Skipping reconnection attempt - too soon");
      return;
    }

    if (isConnectingRef.current || isConnected) {
      return;
    }

    isConnectingRef.current = true;
    lastReconnectTimeRef.current = now;
    cleanup();

    try {
      // Build SSE URL with query parameters
      const url = new URL("/api/sse", window.location.origin);
      if (providedClientId) {
        url.searchParams.set("clientId", providedClientId);
      }
      if (sessionId) {
        url.searchParams.set("sessionId", sessionId);
      }

      console.log("SSE: Attempting connection to", url.toString());
      console.log("SSE: Window location origin:", window.location.origin);
      console.log("SSE: Full URL:", url.toString());

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      console.log("SSE: EventSource created:", eventSource);
      console.log("SSE: EventSource readyState:", eventSource.readyState);

      eventSource.onopen = () => {
        setIsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        console.log("SSE: Connection established successfully");
      };

      // Add specific event listener for connected event
      eventSource.addEventListener("connected", (event) => {
        console.log("SSE: Connected event received:", event);
        console.log("SSE: Connected event type:", event.type);
        console.log("SSE: Connected event data:", event.data);
        try {
          const data = JSON.parse(event.data);
          console.log("SSE: Connected event parsed data:", data);
          if (data.clientId) {
            console.log(
              "SSE: Setting client ID from connected event:",
              data.clientId,
            );
            setClientId(data.clientId);
            onConnect?.(data.clientId);
          }
        } catch (error) {
          console.error("SSE: Error parsing connected event:", error);
        }
      });

      // Add specific event listener for notification events
      eventSource.addEventListener("notification", (event) => {
        console.log("SSE: Notification event received:", event);
        console.log("SSE: Notification event type:", event.type);
        console.log("SSE: Notification event data:", event.data);
        try {
          const data = JSON.parse(event.data);
          console.log("SSE: Notification event parsed data:", data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: "notification",
            data,
          };
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (error) {
          console.error("SSE: Error parsing notification event:", error);
        }
      });

      eventSource.onmessage = (event) => {
        try {
          console.log("SSE: Raw message received:", event);
          console.log("SSE: Event type:", event.type);
          console.log("SSE: Event data:", event.data);

          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: event.type || "message",
            data,
          };

          console.log("SSE: Parsed event:", sseEvent);
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);

          // Handle connection confirmation
          if (sseEvent.event === "connected" && sseEvent.data.clientId) {
            console.log(
              "SSE: Connection confirmed with client ID:",
              sseEvent.data.clientId,
            );
            setClientId(sseEvent.data.clientId as string);
            onConnect?.(sseEvent.data.clientId as string);
          }
        } catch (error) {
          console.error("SSE: Error parsing message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE: Connection error occurred");
        console.error("SSE: Error object:", error);
        console.error("SSE: EventSource readyState:", eventSource.readyState);
        console.error("SSE: EventSource URL:", eventSource.url);
        console.error("SSE: Error type:", error.type);
        console.error("SSE: Error target:", error.target);

        onError?.(error);

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("SSE: Connection closed, attempting cleanup");
          setIsConnected(false);
          isConnectingRef.current = false;

          // Attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;

            // Exponential backoff: increase interval with each attempt
            const backoffInterval =
              reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
            const maxInterval = 30000; // Cap at 30 seconds
            const actualInterval = Math.min(backoffInterval, maxInterval);

            console.log(
              `SSE: Reconnecting in ${actualInterval}ms... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, actualInterval);
          } else {
            console.error("SSE: Max reconnection attempts reached");
          }
        }
      };
    } catch (error) {
      console.error("SSE: Error creating connection:", error);
      isConnectingRef.current = false;
      onError?.(error as Event);
    }
  }, [
    providedClientId,
    sessionId,
    isConnected,
    onConnect,
    onError,
    onMessage,
    reconnectInterval,
    maxReconnectAttempts,
    cleanup,
  ]);

  const disconnect = useCallback(() => {
    console.log("SSE: Disconnecting");
    cleanup();
    onDisconnect?.();
  }, [cleanup, onDisconnect]);

  const reconnect = useCallback(() => {
    console.log("SSE: Manual reconnection requested");
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Only cleanup on actual unmount, not hot reloads
    return () => {
      // In development, we'll let the connection persist across hot reloads
      // The connection will be cleaned up when the page is actually closed
      if (process.env.NODE_ENV === "production") {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    clientId,
    lastMessage,
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for listening to specific SSE events
 */
export function useSSEEvent(
  eventName: string,
  callback: (data: Record<string, unknown>) => void,
  options: Omit<UseSSEOptions, "onMessage"> = {},
) {
  const { useSSE } = require("./useSSE");

  const handleMessage = useCallback(
    (event: SSEEvent) => {
      if (event.event === eventName) {
        callback(event.data);
      }
    },
    [eventName, callback],
  );

  return useSSE({
    ...options,
    onMessage: handleMessage,
  });
}

/**
 * Hook for receiving notifications
 */
export function useSSENotifications(
  options: Omit<UseSSEOptions, "onMessage"> = {},
) {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      type: "info" | "success" | "warning" | "error";
      timestamp: number;
    }>
  >([]);

  const handleNotification = useCallback((data: Record<string, unknown>) => {
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      title: data.title as string,
      message: data.message as string,
      type: data.type as "info" | "success" | "warning" | "error",
      timestamp: data.timestamp as number,
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Use the existing SSE connection from the parent component
  const sse = useSSE({
    ...options,
    autoConnect: false, // Don't create a new connection
    onMessage: (event) => {
      if (event.event === "notification") {
        handleNotification(event.data);
      }
    },
  });

  return {
    ...sse,
    notifications,
    clearNotifications,
  };
}
