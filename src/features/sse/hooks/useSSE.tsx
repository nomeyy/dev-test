"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent } from "@/types/sse";
import { SSE_EVENT_TYPES } from "@/types/sse";

interface SSEOptions {
  /** Automatically connect on mount */
  autoConnect?: boolean;
  /** Retry connection on failure */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Additional headers to send */
  headers?: Record<string, string>;
}

interface SSEState {
  /** Current connection status */
  status: "disconnected" | "connecting" | "connected" | "error";
  /** Last received event */
  lastEvent: SSEEvent | null;
  /** Connection error if any */
  error: string | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

type EventListener = (event: SSEEvent) => void;

/**
 * React hook for managing Server-Sent Events connections
 * Provides real-time event handling with automatic reconnection
 */
export function useSSE(options: SSEOptions = {}) {
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [state, setState] = useState<SSEState>({
    status: "disconnected",
    lastEvent: null,
    error: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<EventListener>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    setState((prev) => ({ ...prev, status: "connecting", error: null }));

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection
      const eventSource = new EventSource("/api/sse", {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      // Handle connection opened
      eventSource.onopen = () => {
        setState((prev) => ({
          ...prev,
          status: "connected",
          error: null,
          reconnectAttempts: 0,
        }));
      };

      // Handle connection errors
      eventSource.onerror = () => {
        setState((prev) => ({ ...prev, status: "error" }));

        if (autoReconnect && state.reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setState((prev) => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            connect();
          }, reconnectDelay);
        }
      };

      // Handle generic messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: event.type ?? "message",
            data,
            id: event.lastEventId,
          };

          setState((prev) => ({ ...prev, lastEvent: sseEvent }));

          // Notify listeners
          const listeners = listenersRef.current.get(sseEvent.type);
          if (listeners) {
            listeners.forEach((listener) => listener(sseEvent));
          }
        } catch (error) {
          console.error("Failed to parse SSE event:", error);
        }
      };

      // Handle named events
      Object.values(SSE_EVENT_TYPES).forEach((eventType) => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const customEvent = event;
            const data = JSON.parse(customEvent.data);
            const sseEvent: SSEEvent = {
              type: eventType,
              data,
              id: customEvent.lastEventId,
            };

            setState((prev) => ({ ...prev, lastEvent: sseEvent }));

            // Notify listeners
            const listeners = listenersRef.current.get(eventType);
            if (listeners) {
              listeners.forEach((listener) => listener(sseEvent));
            }
          } catch (error) {
            console.error(`Failed to parse SSE event ${eventType}:`, error);
          }
        });
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    state.reconnectAttempts,
  ]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: "disconnected",
      error: null,
      reconnectAttempts: 0,
    }));
  }, []);

  /**
   * Add event listener for specific event type
   */
  const addEventListener = useCallback(
    (eventType: string, listener: EventListener) => {
      const listeners = listenersRef.current.get(eventType) ?? new Set();
      listeners.add(listener);
      listenersRef.current.set(eventType, listeners);

      // Return cleanup function
      return () => {
        const currentListeners = listenersRef.current.get(eventType);
        if (currentListeners) {
          currentListeners.delete(listener);
          if (currentListeners.size === 0) {
            listenersRef.current.delete(eventType);
          }
        }
      };
    },
    [],
  );

  /**
   * Remove event listener
   */
  const removeEventListener = useCallback(
    (eventType: string, listener: EventListener) => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    },
    [],
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
  };
}
