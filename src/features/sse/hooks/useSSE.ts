"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  SSEEvent,
  SSEClientOptions,
  SSEEventHandler,
  SSEErrorHandler,
  SSEConnectionHandler,
} from "../types";

interface UseSSEReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: SSEEvent | null;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (type: string, handler: SSEEventHandler) => void;
  removeEventListener: (type: string, handler: SSEEventHandler) => void;
}

const DEFAULT_OPTIONS: Required<SSEClientOptions> = {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

/**
 * React hook for consuming SSE events
 */
export function useSSE(
  sessionId?: string,
  options: SSEClientOptions = {},
  onConnect?: SSEConnectionHandler,
  onDisconnect?: SSEConnectionHandler,
  onError?: SSEErrorHandler,
): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlers = useRef<Map<string, Set<SSEEventHandler>>>(new Map());

  const config = { ...DEFAULT_OPTIONS, ...options };

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
    setIsConnecting(false);
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const url = new URL("/api/sse", window.location.origin);
      if (sessionId) {
        url.searchParams.set("sessionId", sessionId);
      }

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        onConnect?.();
        console.log("SSE connection established");
      };

      eventSource.onerror = (event) => {
        const errorObj = new Error("SSE connection error");
        setError(errorObj);
        setIsConnected(false);
        setIsConnecting(false);
        onError?.(errorObj);

        console.error("SSE connection error:", event);

        // Attempt reconnection if enabled
        if (
          config.reconnect &&
          reconnectAttempts.current < config.maxReconnectAttempts
        ) {
          reconnectAttempts.current++;
          console.log(
            `Attempting SSE reconnection ${reconnectAttempts.current}/${config.maxReconnectAttempts}`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            cleanup();
            connect();
          }, config.reconnectInterval);
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: event.type || "message",
            data: parsedData,
            id: event.lastEventId,
          };

          setLastEvent(sseEvent);

          // Call registered event handlers
          const handlers = eventHandlers.current.get(sseEvent.type);
          if (handlers) {
            handlers.forEach((handler) => handler(sseEvent));
          }

          // Call generic message handlers
          const messageHandlers = eventHandlers.current.get("message");
          if (messageHandlers && sseEvent.type === "message") {
            messageHandlers.forEach((handler) => handler(sseEvent));
          }
        } catch (parseError) {
          console.error("Error parsing SSE event data:", parseError);
          setError(new Error("Failed to parse SSE event data"));
        }
      };

      // Handle custom event types
      const handleCustomEvent =
        (eventType: string) => (event: MessageEvent) => {
          try {
            const parsedData = JSON.parse(event.data);
            const sseEvent: SSEEvent = {
              type: eventType,
              data: parsedData,
              id: event.lastEventId,
            };

            setLastEvent(sseEvent);

            const handlers = eventHandlers.current.get(eventType);
            if (handlers) {
              handlers.forEach((handler) => handler(sseEvent));
            }
          } catch (parseError) {
            console.error(
              `Error parsing SSE event data for ${eventType}:`,
              parseError,
            );
          }
        };

      // Register common event types
      const commonEvents = [
        "heartbeat",
        "connection",
        "system",
        "resource_update",
        "notification",
      ];
      commonEvents.forEach((eventType) => {
        eventSource.addEventListener(eventType, handleCustomEvent(eventType));
      });
    } catch (connectError) {
      const errorObj =
        connectError instanceof Error
          ? connectError
          : new Error("Failed to connect to SSE");
      setError(errorObj);
      setIsConnecting(false);
      onError?.(errorObj);
      console.error("SSE connection failed:", connectError);
    }
  }, [
    sessionId,
    config,
    onConnect,
    onError,
    onDisconnect,
    isConnecting,
    cleanup,
  ]);

  const disconnect = useCallback(() => {
    cleanup();
    onDisconnect?.();
    console.log("SSE connection disconnected");
  }, [cleanup, onDisconnect]);

  const addEventListener = useCallback(
    (type: string, handler: SSEEventHandler) => {
      const handlers = eventHandlers.current.get(type) || new Set();
      handlers.add(handler);
      eventHandlers.current.set(type, handlers);
    },
    [],
  );

  const removeEventListener = useCallback(
    (type: string, handler: SSEEventHandler) => {
      const handlers = eventHandlers.current.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlers.current.delete(type);
        }
      }
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    lastEvent,
    error,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
  };
}
