"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEventPayload } from "../types";

/**
 * SSE Event handler type
 */
export type SSEEventHandler = (event: string, data: SSEEventPayload) => void;

/**
 * SSE Connection status
 */
export type SSEConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * SSE Hook configuration
 */
export interface UseSSEOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: SSEEventHandler;
}

/**
 * SSE Hook return type
 */
export interface UseSSEReturn {
  status: SSEConnectionStatus;
  clientId: string | null;
  userId: string | null;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (event: string, handler: SSEEventHandler) => void;
  removeEventListener: (event: string, handler: SSEEventHandler) => void;
  sendTestMessage: (message: string) => void;
}

/**
 * React hook for Server-Sent Events (SSE)
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = "/api/sse",
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const [clientId, setClientId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, SSEEventHandler[]>>(new Map());

  // Event handlers
  const handleOpen = useCallback(() => {
    setStatus("connected");
    reconnectAttemptsRef.current = 0;
    onConnect?.();
  }, [onConnect]);

  const handleClose = useCallback(() => {
    setStatus("disconnected");
    onDisconnect?.();
  }, [onDisconnect]);

  const handleError = useCallback(
    (error: Event) => {
      setStatus("error");
      onError?.(error);

      // Attempt to reconnect if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    },
    [maxReconnectAttempts, reconnectInterval, onError],
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const eventName = event.type || "message";

        // Handle specific events
        if (eventName === "connected") {
          setClientId(data.clientId);
          setUserId(data.userId);
        }

        // Call global message handler
        onMessage?.(eventName, data);

        // Call specific event handlers
        const handlers = eventHandlersRef.current.get(eventName);
        if (handlers) {
          handlers.forEach((handler) => handler(eventName, data));
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    },
    [onMessage],
  );

  // Connect function
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      setStatus("connecting");
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = handleOpen;
      eventSource.onerror = handleError;
      eventSource.onmessage = handleMessage;

      // Listen for specific events
      eventSource.addEventListener("connected", handleMessage);
      eventSource.addEventListener("heartbeat", handleMessage);
      eventSource.addEventListener("notification", handleMessage);
      eventSource.addEventListener("system", handleMessage);
      eventSource.addEventListener("test", handleMessage);
      eventSource.addEventListener("progress", handleMessage);
      eventSource.addEventListener("chat_message", handleMessage);
      eventSource.addEventListener("friend_request", handleMessage);
      eventSource.addEventListener("video_processing", handleMessage);
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      setStatus("error");
    }
  }, [url, handleOpen, handleError, handleMessage]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus("disconnected");
    setClientId(null);
    setUserId(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Add event listener
  const addEventListener = useCallback(
    (event: string, handler: SSEEventHandler) => {
      const handlers = eventHandlersRef.current.get(event) || [];
      handlers.push(handler);
      eventHandlersRef.current.set(event, handlers);
    },
    [],
  );

  // Remove event listener
  const removeEventListener = useCallback(
    (event: string, handler: SSEEventHandler) => {
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            eventHandlersRef.current.delete(event);
          }
        }
      }
    },
    [],
  );

  // Send test message (for demo purposes)
  const sendTestMessage = useCallback(
    (message: string) => {
      if (status === "connected" && clientId) {
        // In a real app, you might want to send this via tRPC or a separate API
        console.log("Test message:", message);
      }
    },
    [status, clientId],
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    clientId,
    userId,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
    sendTestMessage,
  };
}
