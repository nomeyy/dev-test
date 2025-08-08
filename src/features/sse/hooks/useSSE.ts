"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SSEOptions {
  url?: string;
  sessionId?: string;
  withCredentials?: boolean;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableLogging?: boolean;
}

export interface SSEState {
  isConnected: boolean;
  lastMessage: unknown | null;
  lastEventType: string | null;
  error: Error | null;
  reconnectAttempts: number;
}

export interface SSEHandlers {
  [eventType: string]: (data: unknown) => void;
}

export function useSSE(options: SSEOptions = {}) {
  const {
    url = "/api/sse",
    sessionId,
    withCredentials = true,
    onOpen,
    onError,
    onMessage,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    enableLogging = true,
  } = options;

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    lastMessage: null,
    lastEventType: null,
    error: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef<SSEHandlers>({});
  const isManuallyClosedRef = useRef(false);

  const log = useCallback(
    (level: "info" | "warn" | "error", message: string, ...args: unknown[]) => {
      if (!enableLogging) return;
      const prefix = "[useSSE]";
      switch (level) {
        case "info":
          console.info(`${prefix} ${message}`, ...args);
          break;
        case "warn":
          console.warn(`${prefix} ${message}`, ...args);
          break;
        case "error":
          console.error(`${prefix} ${message}`, ...args);
          break;
      }
    },
    [enableLogging],
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      log("warn", "Already connected");
      return;
    }

    isManuallyClosedRef.current = false;

    // Build URL with query parameters
    const fullUrl = new URL(url, window.location.origin);
    if (sessionId) {
      fullUrl.searchParams.set("sessionId", sessionId);
    }

    log("info", "Connecting to SSE endpoint:", fullUrl.toString());

    try {
      const eventSource = new EventSource(fullUrl.toString(), {
        withCredentials,
      });

      eventSource.onopen = () => {
        log("info", "SSE connection opened");
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          reconnectAttempts: 0,
        }));
        onOpen?.();
      };

      eventSource.onerror = (error) => {
        log("error", "SSE connection error:", error);

        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: new Error("SSE connection failed"),
        }));

        onError?.(error);

        // Attempt reconnection if not manually closed
        if (
          !isManuallyClosedRef.current &&
          state.reconnectAttempts < maxReconnectAttempts
        ) {
          log(
            "info",
            `Reconnecting in ${reconnectInterval}ms (attempt ${state.reconnectAttempts + 1}/${maxReconnectAttempts})`,
          );

          setState((prev) => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (state.reconnectAttempts >= maxReconnectAttempts) {
          log("error", "Max reconnection attempts reached");
        }

        eventSource.close();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          log("info", "Received message:", data);

          setState((prev) => ({
            ...prev,
            lastMessage: data,
            lastEventType: "message",
          }));

          onMessage?.(event);
        } catch (error) {
          log("error", "Failed to parse message:", error, event.data);
        }
      };

      // Register custom event handlers
      for (const [eventType, handler] of Object.entries(handlersRef.current)) {
        eventSource.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            log("info", `Received ${eventType} event:`, data);

            setState((prev) => ({
              ...prev,
              lastMessage: data,
              lastEventType: eventType,
            }));

            handler(data);
          } catch (error) {
            log("error", `Failed to handle ${eventType} event:`, error);
          }
        });
      }

      // Add heartbeat handler
      eventSource.addEventListener("heartbeat", (event) => {
        log("info", "Heartbeat received:", event.data);
      });

      // Add connected handler
      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(event.data);
          log("info", "Connection confirmed:", data);
        } catch (error) {
          log("error", "Failed to parse connected event:", error);
        }
      });

      eventSourceRef.current = eventSource;
    } catch (error) {
      log("error", "Failed to create EventSource:", error);
      setState((prev) => ({
        ...prev,
        error: error as Error,
      }));
    }
  }, [
    url,
    sessionId,
    withCredentials,
    onOpen,
    onError,
    onMessage,
    reconnectInterval,
    maxReconnectAttempts,
    state.reconnectAttempts,
    log,
  ]);

  const disconnect = useCallback(() => {
    log("info", "Disconnecting SSE");
    isManuallyClosedRef.current = true;

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
      isConnected: false,
      reconnectAttempts: 0,
    }));
  }, [log]);

  const addEventListener = useCallback(
    (eventType: string, handler: (data: unknown) => void) => {
      log("info", `Adding event listener for: ${eventType}`);
      handlersRef.current[eventType] = handler;

      // If already connected, add the listener to the existing EventSource
      if (
        eventSourceRef.current &&
        eventSourceRef.current.readyState === EventSource.OPEN
      ) {
        eventSourceRef.current.addEventListener(
          eventType,
          (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              setState((prev) => ({
                ...prev,
                lastMessage: data,
                lastEventType: eventType,
              }));
              handler(data);
            } catch (error) {
              log("error", `Failed to handle ${eventType} event:`, error);
            }
          },
        );
      }
    },
    [log],
  );

  const removeEventListener = useCallback(
    (eventType: string) => {
      log("info", `Removing event listener for: ${eventType}`);
      delete handlersRef.current[eventType];
    },
    [log],
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Only run on mount/unmount

  return {
    state,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
    isConnected: state.isConnected,
    lastMessage: state.lastMessage,
    lastEventType: state.lastEventType,
    error: state.error,
  };
}
