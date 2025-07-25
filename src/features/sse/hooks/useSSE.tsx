"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { logger } from "@/utils/logging";

const log = logger.createContextLogger("SSE-Client");

/**
 * SSE Event data structure for client-side handling
 */
export interface SSEEventData {
  event: string;
  data: unknown;
  id?: string;
  timestamp?: string;
}

/**
 * Connection state for SSE
 */
export type SSEConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

/**
 * Options for SSE connection
 */
export interface SSEOptions {
  /** Automatically reconnect on connection loss */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Additional query parameters */
  queryParams?: Record<string, string>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * SSE Hook return type
 */
export interface UseSSEReturn {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Last received event */
  lastEvent: SSEEventData | null;
  /** Connection error if any */
  error: string | null;
  /** Connection statistics */
  stats: {
    connectionId: string | null;
    connectedAt: Date | null;
    reconnectCount: number;
    eventCount: number;
  };
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** Send a test event (for development) */
  sendTestEvent: () => void;
}

/**
 * React hook for Server-Sent Events connection
 * Provides automatic connection management, reconnection, and event handling
 */
export function useSSE(
  url = "/api/sse",
  options: SSEOptions = {},
): UseSSEReturn {
  const {
    autoReconnect = true,
    reconnectDelay = 5000, // Increased from 3 seconds to 5 seconds
    maxReconnectAttempts = 3, // Reduced from 5 to 3 attempts
    queryParams = {},
    debug = false,
  } = options;

  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("disconnected");
  const [lastEvent, setLastEvent] = useState<SSEEventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    connectionId: null as string | null,
    connectedAt: null as Date | null,
    reconnectCount: 0,
    eventCount: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);
  const isConnectingRef = useRef(false);

  // Build URL with query parameters
  const buildURL = useCallback(() => {
    const urlObj = new URL(url, window.location.origin);
    Object.entries(queryParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
    return urlObj.toString();
  }, [url, queryParams]);

  // Handle connection events
  const handleOpen = useCallback(() => {
    if (debug) log.info("SSE connection opened");
    setConnectionState("connected");
    setError(null);

    // Only reset reconnection attempts after a short stable period
    setTimeout(() => {
      reconnectAttemptsRef.current = 0;
    }, 2000); // Wait 2 seconds before resetting

    setStats((prev) => ({
      ...prev,
      connectedAt: new Date(),
    }));
  }, [debug]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const eventData: SSEEventData = {
          event: event.type,
          data: JSON.parse(event.data as string) as unknown,
          id: event.lastEventId ?? undefined,
          timestamp: new Date().toISOString(),
        };

        if (debug) log.debug("SSE event received", { event: eventData.event });

        setLastEvent(eventData);
        setStats((prev) => ({
          ...prev,
          eventCount: prev.eventCount + 1,
        }));

        // Handle special events
        if (
          eventData.event === "connected" &&
          typeof eventData.data === "object" &&
          eventData.data !== null &&
          "connectionId" in eventData.data
        ) {
          setStats((prev) => ({
            ...prev,
            connectionId: (eventData.data as { connectionId: string })
              .connectionId,
          }));
        }
      } catch (error) {
        log.error("Failed to parse SSE event data", error);
      }
    },
    [debug],
  );

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    // Prevent multiple concurrent connections
    if (isConnectingRef.current) {
      if (debug) log.info("Connection attempt already in progress, skipping");
      return;
    }

    if (
      eventSourceRef.current &&
      eventSourceRef.current.readyState !== EventSource.CLOSED
    ) {
      if (debug) log.info("Connection already exists, closing previous one");
      eventSourceRef.current.close();
    }

    isConnectingRef.current = true;

    const performReconnect = () => {
      reconnectAttemptsRef.current++;
      setStats((prev) => ({
        ...prev,
        reconnectCount: prev.reconnectCount + 1,
      }));
      connect();
    };

    const connectionHandleError = (event: Event) => {
      // Check if this is just a normal connection close
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        return; // Don't treat normal closure as an error
      }

      const errorMessage = "SSE connection error";
      log.error(errorMessage, event);

      setConnectionState("error");
      setError(errorMessage);

      // Auto-reconnect if enabled and not manually disconnected
      if (autoReconnect && !isManualDisconnectRef.current) {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setConnectionState("reconnecting");
          // Use exponential backoff for reconnection attempts
          const backoffDelay = Math.min(
            reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
            30000,
          );
          reconnectTimeoutRef.current = setTimeout(
            performReconnect,
            backoffDelay,
          );
        } else {
          log.error("Max reconnection attempts reached");
          setError("Maximum reconnection attempts exceeded");
        }
      }
    };

    try {
      setConnectionState("connecting");
      setError(null);

      const eventSource = new EventSource(buildURL());
      eventSourceRef.current = eventSource;

      // Add connection stability check
      let connectionEstablished = false;

      // Set up event listeners
      eventSource.onopen = (event) => {
        connectionEstablished = true;
        isConnectingRef.current = false;
        handleOpen();
      };

      eventSource.onerror = (event) => {
        // Only handle as error if connection was established and then failed
        if (connectionEstablished) {
          connectionHandleError(event);
        }
      };

      eventSource.onmessage = handleMessage;

      // Listen for custom events
      eventSource.addEventListener("connected", (event) => {
        handleMessage(event);
      });

      eventSource.addEventListener("heartbeat", (event) => {
        if (debug) log.debug("Heartbeat received");
        handleMessage(event);
      });

      eventSource.addEventListener("system_alert", (event) => {
        handleMessage(event);
      });

      eventSource.addEventListener("resource_update", (event) => {
        handleMessage(event);
      });

      eventSource.addEventListener("progress_update", (event) => {
        handleMessage(event);
      });

      eventSource.addEventListener("user_updated", (event) => {
        handleMessage(event);
      });

      eventSource.addEventListener("test_notification", (event) => {
        handleMessage(event);
      });

      eventSource.addEventListener("custom_event", (event) => {
        handleMessage(event);
      });
    } catch (error) {
      log.error("Failed to establish SSE connection", error);
      setConnectionState("error");
      setError(error instanceof Error ? error.message : "Connection failed");
      isConnectingRef.current = false;
    }
  }, [
    buildURL,
    handleOpen,
    handleMessage,
    debug,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
  ]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      if (debug) {
        log.info("Manually closing SSE connection", {
          readyState: eventSourceRef.current.readyState,
          url: eventSourceRef.current.url,
        });
      }
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState("disconnected");
    setError(null);
    if (debug) log.info("SSE connection manually disconnected");
  }, [debug]);

  // Reconnect function
  const reconnect = useCallback(() => {
    isManualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Send test event (for development/debugging)
  const sendTestEvent = useCallback(() => {
    // In a real implementation, you might send this via a separate API
    // For now, this is just a placeholder
    if (debug) {
      log.info("Test event triggered (placeholder)");
    }
  }, [debug]);

  // Initialize connection on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      isManualDisconnectRef.current = false;
      // Add a small delay to prevent immediate connection in development
      const timer = setTimeout(() => {
        connect();
      }, 100);

      // Cleanup on unmount
      return () => {
        clearTimeout(timer);
        isManualDisconnectRef.current = true;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }
  }, []); // Remove connect dependency to prevent re-runs

  return {
    connectionState,
    lastEvent,
    error,
    stats,
    reconnect,
    disconnect,
    sendTestEvent,
  };
}

/**
 * Hook to listen for specific SSE events
 */
export function useSSEEvent(
  eventType: string,
  handler: (data: unknown) => void,
  sseHook?: UseSSEReturn | null,
) {
  // Always call useSSE first, then use sseHook if provided
  const defaultSSE = useSSE();
  const { lastEvent } = sseHook ?? defaultSSE;

  // Use ref to store the latest handler without causing re-renders
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (lastEvent && lastEvent.event === eventType) {
      handlerRef.current(lastEvent.data);
    }
  }, [lastEvent, eventType]);
}

/**
 * Hook for handling multiple SSE event types
 */
export function useSSEEvents(
  eventHandlers: Record<string, (data: unknown) => void>,
  sseHook?: UseSSEReturn | null,
) {
  // Always call useSSE first, then use sseHook if provided
  const defaultSSE = useSSE();
  const { lastEvent } = sseHook ?? defaultSSE;

  // Use ref to store the latest handlers without causing re-renders
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    if (lastEvent && lastEvent.event in handlersRef.current) {
      const handler = handlersRef.current[lastEvent.event];
      if (handler) {
        handler(lastEvent.data);
      }
    }
  }, [lastEvent]);
}
