"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "../../../features/auth/client";
import type {
  SSEEvent,
  NotificationEventData,
  UploadProgressEventData,
} from "../types";

export enum SSEConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
  RECONNECTING = "reconnecting",
}

export interface UseSSEOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
}

export interface UseSSEReturn {
  connectionState: SSEConnectionState;
  lastEvent: SSEEvent | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (
    eventType: string,
    handler: (event: SSEEvent) => void,
  ) => () => void;
  stats: {
    connectionTime: Date | null;
    reconnectAttempts: number;
    eventsReceived: number;
  };
}

function parseSSEEventData(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function extractEventData(event: MessageEvent<unknown>): string {
  if (typeof event.data === "string") {
    return event.data;
  }
  // Fallback to string conversion for non-string data
  return String(event.data);
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    debug = false,
  } = options;

  const session = useSession();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(
    new Map(),
  );

  const [connectionState, setConnectionState] = useState<SSEConnectionState>(
    SSEConnectionState.DISCONNECTED,
  );
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    connectionTime: null as Date | null,
    reconnectAttempts: 0,
    eventsReceived: 0,
  });

  const log = useCallback(
    (message: string, ...args: unknown[]) => {
      if (debug) {
        console.log(`[useSSE] ${message}`, ...args);
      }
    },
    [debug],
  );

  const addEventListener = useCallback(
    (eventType: string, handler: (event: SSEEvent) => void): (() => void) => {
      const listeners = eventListenersRef.current;

      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }

      listeners.get(eventType)!.add(handler);
      log(`Added listener for event type: ${eventType}`);

      return () => {
        const typeListeners = listeners.get(eventType);
        if (typeListeners) {
          typeListeners.delete(handler);
          if (typeListeners.size === 0) {
            listeners.delete(eventType);
          }
        }
        log(`Removed listener for event type: ${eventType}`);
      };
    },
    [log],
  );

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      log("Received event:", event);

      setLastEvent(event);
      setStats((prev) => ({
        ...prev,
        eventsReceived: prev.eventsReceived + 1,
      }));

      // Notify specific event listeners
      const listeners = eventListenersRef.current.get(event.type);
      if (listeners) {
        listeners.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            console.error(
              `[useSSE] Error in event handler for ${event.type}:`,
              error,
            );
          }
        });
      }

      // Notify wildcard listeners
      const wildcardListeners = eventListenersRef.current.get("*");
      if (wildcardListeners) {
        wildcardListeners.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            console.error(`[useSSE] Error in wildcard event handler:`, error);
          }
        });
      }
    },
    [log],
  );

  const connect = useCallback(() => {
    if (!session) {
      log("Cannot connect: No session");
      setError("Authentication required");
      return;
    }

    if (eventSourceRef.current) {
      log("Already connected or connecting");
      return;
    }

    log("Connecting to SSE...");
    setConnectionState(SSEConnectionState.CONNECTING);
    setError(null);

    try {
      const eventSource = new EventSource("/api/sse", {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        log("SSE connection opened");
        setConnectionState(SSEConnectionState.CONNECTED);
        setStats((prev) => ({
          ...prev,
          connectionTime: new Date(),
          reconnectAttempts: 0,
        }));
      };

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const eventData = extractEventData(event);
          const data = parseSSEEventData(eventData);
          handleEvent({
            type: event.type || "message",
            data,
            id: event.lastEventId || undefined,
          });
        } catch (error) {
          console.error("[useSSE] Error parsing message:", error);
        }
      };

      const eventTypes = [
        "heartbeat",
        "user_notification",
        "system_alert",
        "upload_progress",
        "upload_complete",
        "connection_status",
        "ping",
        "custom",
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const messageEvent = event as MessageEvent<unknown>;
            const eventData = extractEventData(messageEvent);
            const data = parseSSEEventData(eventData);
            handleEvent({
              type: eventType,
              data,
              id: messageEvent.lastEventId || undefined,
            });
          } catch (error) {
            console.error(`[useSSE] Error parsing ${eventType} event:`, error);
          }
        });
      });

      // Handle errors
      eventSource.onerror = (event) => {
        log("SSE connection error:", event);

        if (eventSource.readyState === EventSource.CLOSED) {
          setConnectionState(SSEConnectionState.DISCONNECTED);
          setError("Connection closed by server");

          // Auto-reconnect if enabled
          if (autoReconnect && stats.reconnectAttempts < maxReconnectAttempts) {
            setConnectionState(SSEConnectionState.RECONNECTING);
            setStats((prev) => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));

            reconnectTimeoutRef.current = setTimeout(() => {
              log(`Reconnecting... (attempt ${stats.reconnectAttempts + 1})`);
              eventSourceRef.current = null;
              connect();
            }, reconnectDelay);
          }
        } else {
          setConnectionState(SSEConnectionState.ERROR);
          setError("Connection error occurred");
        }
      };
    } catch (error) {
      console.error("[useSSE] Failed to create EventSource:", error);
      setConnectionState(SSEConnectionState.ERROR);
      setError(error instanceof Error ? error.message : "Failed to connect");
    }
  }, [
    session,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    stats.reconnectAttempts,
    handleEvent,
    log,
  ]);

  const disconnect = useCallback(() => {
    log("Disconnecting from SSE...");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState(SSEConnectionState.DISCONNECTED);
    setError(null);
    setStats((prev) => ({
      ...prev,
      connectionTime: null,
    }));
  }, [log]);

  // Auto-connect on mount if session is available
  useEffect(() => {
    if (
      autoConnect &&
      session &&
      connectionState === SSEConnectionState.DISCONNECTED
    ) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session, autoConnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    lastEvent,
    error,
    connect,
    disconnect,
    addEventListener,
    stats,
  };
}

function isNotificationEventData(data: unknown): data is NotificationEventData {
  return (
    typeof data === "object" &&
    data !== null &&
    "title" in data &&
    "message" in data &&
    "severity" in data &&
    "timestamp" in data
  );
}

function isUploadProgressEventData(
  data: unknown,
): data is UploadProgressEventData {
  return (
    typeof data === "object" &&
    data !== null &&
    "uploadId" in data &&
    "progress" in data &&
    "status" in data
  );
}

export function useSSENotifications() {
  const [notifications, setNotifications] = useState<NotificationEventData[]>(
    [],
  );
  const sse = useSSE();

  useEffect(() => {
    const unsubscribe = sse.addEventListener("user_notification", (event) => {
      if (isNotificationEventData(event.data)) {
        const notification = event.data;
        setNotifications((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10
      } else {
        console.warn(
          "[useSSENotifications] Received invalid notification data:",
          event.data,
        );
      }
    });

    return unsubscribe;
  }, [sse]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((timestamp: number) => {
    setNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
  }, []);

  return {
    notifications,
    clearNotifications,
    removeNotification,
    connectionState: sse.connectionState,
  };
}

export function useSSEUploadProgress(uploadId?: string) {
  const [progress, setProgress] = useState<UploadProgressEventData | null>(
    null,
  );
  const sse = useSSE();

  useEffect(() => {
    const unsubscribe = sse.addEventListener("upload_progress", (event) => {
      if (isUploadProgressEventData(event.data)) {
        const progressData = event.data;

        if (!uploadId || progressData.uploadId === uploadId) {
          setProgress(progressData);
        }
      } else {
        console.warn(
          "[useSSEUploadProgress] Received invalid progress data:",
          event.data,
        );
      }
    });

    return unsubscribe;
  }, [sse, uploadId]);

  return {
    progress,
    connectionState: sse.connectionState,
  };
}
