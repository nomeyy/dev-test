/**
 * React Hook for SSE
 * ------------------
 * Custom React hook for managing SSE connections and events
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSSEClient, type SSEClient } from "../utils/sse-client";
import type {
  SSEEvent,
  SSEClientOptions,
  NotificationPayload,
  MessagePayload,
} from "../types";

export interface UseSSEOptions extends SSEClientOptions {
  /** SSE endpoint URL */
  url?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

export interface UseSSEReturn {
  /** Current connection state */
  isConnected: boolean;
  /** Manual connect function */
  connect: () => void;
  /** Manual disconnect function */
  disconnect: () => void;
  /** Last received event */
  lastEvent: SSEEvent | null;
  /** Connection error */
  error: Event | null;
  /** Add event listener */
  addEventListener: <T>(
    eventType: string,
    handler: (event: SSEEvent<T>) => void,
  ) => void;
  /** Remove event listener */
  removeEventListener: <T>(
    eventType: string,
    handler: (event: SSEEvent<T>) => void,
  ) => void;
}

/**
 * Main SSE hook
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { url = "/api/sse", autoConnect = true, ...clientOptions } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<Event | null>(null);

  const clientRef = useRef<SSEClient | null>(null);
  const handlersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(
    new Map(),
  );

  // Initialize SSE client
  useEffect(() => {
    clientRef.current = createSSEClient(url, clientOptions);

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [url]);

  // Monitor connection state
  useEffect(() => {
    if (!clientRef.current) return;

    const checkConnection = () => {
      const connected = clientRef.current?.isConnected() ?? false;
      setIsConnected(connected);
    };

    // Check connection state periodically
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  // Setup error handling
  useEffect(() => {
    if (!clientRef.current) return;

    const handleError = (error: Event) => {
      setError(error);
      setIsConnected(false);
    };

    clientRef.current.addErrorHandler(handleError);

    return () => {
      clientRef.current?.removeErrorHandler(handleError);
    };
  }, []);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && clientRef.current) {
      clientRef.current.connect();
    }
  }, [autoConnect]);

  // Manual connect function
  const connect = useCallback(() => {
    if (clientRef.current) {
      setError(null);
      clientRef.current.connect();
    }
  }, []);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  // Add event listener
  const addEventListener = useCallback(
    <T>(eventType: string, handler: (event: SSEEvent<T>) => void) => {
      if (!clientRef.current) return;

      // Store handler reference for cleanup
      if (!handlersRef.current.has(eventType)) {
        handlersRef.current.set(eventType, new Set());
      }
      handlersRef.current
        .get(eventType)!
        .add(handler as (event: SSEEvent) => void);

      // Wrapper to update last event state
      const wrappedHandler = (event: SSEEvent<T>) => {
        setLastEvent(event);
        handler(event);
      };

      clientRef.current.addEventListener(eventType, wrappedHandler);
    },
    [],
  );

  // Remove event listener
  const removeEventListener = useCallback(
    <T>(eventType: string, handler: (event: SSEEvent<T>) => void) => {
      if (!clientRef.current) return;

      // Remove from our handler tracking
      const handlers = handlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler as (event: SSEEvent) => void);
        if (handlers.size === 0) {
          handlersRef.current.delete(eventType);
        }
      }

      clientRef.current.removeEventListener(eventType, handler);
    },
    [],
  );

  return {
    isConnected,
    connect,
    disconnect,
    lastEvent,
    error,
    addEventListener,
    removeEventListener,
  };
}

/**
 * Hook specifically for notifications
 */
export function useSSENotifications(options: UseSSEOptions = {}) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const sse = useSSE(options);

  useEffect(() => {
    const handleNotification = (event: SSEEvent<NotificationPayload>) => {
      setNotifications((prev) => [event.data, ...prev].slice(0, 100)); // Keep last 100
    };

    sse.addEventListener("notification", handleNotification);

    return () => {
      sse.removeEventListener("notification", handleNotification);
    };
  }, [sse]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    ...sse,
    notifications,
    clearNotifications,
    removeNotification,
  };
}

/**
 * Hook specifically for messages
 */
export function useSSEMessages(options: UseSSEOptions = {}) {
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const sse = useSSE(options);

  useEffect(() => {
    const handleMessage = (event: SSEEvent<MessagePayload>) => {
      setMessages((prev) => [...prev, event.data]);
    };

    sse.addEventListener("message", handleMessage);

    return () => {
      sse.removeEventListener("message", handleMessage);
    };
  }, [sse]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    ...sse,
    messages,
    clearMessages,
  };
}
