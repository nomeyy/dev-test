"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * SSE Event handler function type
 */
export type SSEEventHandler = (data: unknown) => void;

/**
 * SSE Connection status
 */
export type SSEStatus = "connecting" | "connected" | "disconnected" | "error";

/**
 * SSE Hook options
 */
export interface UseSSEOptions {
  /** Custom endpoint URL (defaults to /api/sse) */
  endpoint?: string;
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Custom heartbeat interval (sent to server) */
  heartbeatInterval?: number;
  /** Debug logging */
  debug?: boolean;
}

/**
 * React hook for SSE connections
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    endpoint = "/api/sse",
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 3000,
    heartbeatInterval,
    debug = false,
  } = options;

  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<{
    event: string;
    data: unknown;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<SSEEventHandler>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log("[SSE]", ...args);
      }
    },
    [debug],
  );

  /**
   * Build the SSE endpoint URL with query parameters
   */
  const buildEndpointUrl = useCallback(() => {
    const url = new URL(endpoint, window.location.origin);
    if (heartbeatInterval) {
      url.searchParams.set("heartbeat", heartbeatInterval.toString());
    }
    return url.toString();
  }, [endpoint, heartbeatInterval]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    const url = buildEndpointUrl();
    log("Connecting to SSE:", url);

    setStatus("connecting");
    setError(null);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      log("SSE connection opened");
      setStatus("connected");
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = (event) => {
      log("SSE connection error:", event);
      setStatus("error");
      setError("Connection error occurred");

      // Close the connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Attempt reconnection if enabled
      if (
        autoReconnect &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        reconnectAttemptsRef.current++;
        log(
          `Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${reconnectDelay}ms`,
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          setStatus("connecting");
          connect();
        }, reconnectDelay);
      } else {
        setStatus("disconnected");
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError(
            `Failed to reconnect after ${maxReconnectAttempts} attempts`,
          );
        }
      }
    };

    // Handle all SSE events
    eventSource.onmessage = (event) => {
      log("Received SSE message:", event);

      try {
        const data = JSON.parse(event.data as string) as unknown;
        const eventType = event.type || "message";

        setLastEvent({ event: eventType, data });

        // Call registered handlers
        const handlers = eventHandlersRef.current.get(eventType);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error("Error in SSE event handler:", error);
            }
          });
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };
  }, [
    buildEndpointUrl,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    log,
  ]);

  /**
   * Disconnect from SSE
   */
  const disconnect = useCallback(() => {
    log("Disconnecting from SSE");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear event listeners tracking
    eventListenersRef.current.clear();

    setStatus("disconnected");
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, [log]);

  // Track EventSource event listeners to avoid duplicates
  const eventListenersRef = useRef<Set<string>>(new Set());

  /**
   * Subscribe to specific SSE events
   */
  const subscribe = useCallback(
    (eventType: string, handler: SSEEventHandler) => {
      if (!eventHandlersRef.current.has(eventType)) {
        eventHandlersRef.current.set(eventType, new Set());
      }

      eventHandlersRef.current.get(eventType)!.add(handler);

      // Add event listener to EventSource for named events (only once per event type)
      if (
        eventSourceRef.current &&
        eventType !== "message" &&
        !eventListenersRef.current.has(eventType)
      ) {
        const eventListener = (event: Event) => {
          try {
            const messageEvent = event as unknown as MessageEvent;
            const data = JSON.parse(messageEvent.data as string) as unknown;
            setLastEvent({ event: eventType, data });

            const handlers = eventHandlersRef.current.get(eventType);
            if (handlers) {
              handlers.forEach((h) => {
                try {
                  h(data);
                } catch (error) {
                  console.error("Error in SSE event handler:", error);
                }
              });
            }
          } catch (error) {
            console.error("Error parsing SSE event data:", error);
          }
        };

        eventSourceRef.current.addEventListener(eventType, eventListener);
        eventListenersRef.current.add(eventType);
      }

      if (debug) {
        console.log("[SSE] Subscribed to event:", eventType);
      }

      // Return unsubscribe function
      return () => {
        const handlers = eventHandlersRef.current.get(eventType);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            eventHandlersRef.current.delete(eventType);
          }
        }
        if (debug) {
          console.log("[SSE] Unsubscribed from event:", eventType);
        }
      };
    },
    [debug],
  );

  /**
   * Unsubscribe from all events of a specific type
   */
  const unsubscribe = useCallback(
    (eventType: string) => {
      eventHandlersRef.current.delete(eventType);
      log("Unsubscribed from all handlers for event:", eventType);
    },
    [log],
  );

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, keep connection but don't auto-reconnect
        log("Page hidden");
      } else {
        // Page is visible, ensure connection
        log("Page visible");
        if (status === "disconnected" || status === "error") {
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, connect, log]);

  return {
    status,
    error,
    lastEvent,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
    isDisconnected: status === "disconnected",
    hasError: status === "error",
  };
}

/**
 * Higher-order component for SSE integration
 */
export interface WithSSEProps {
  sse: ReturnType<typeof useSSE>;
}

export function withSSE<P extends object>(
  Component: React.ComponentType<P & WithSSEProps>,
  sseOptions?: UseSSEOptions,
) {
  return function SSEWrappedComponent(props: P) {
    const sse = useSSE(sseOptions);

    return React.createElement(Component, { ...props, sse } as P &
      WithSSEProps);
  };
}
