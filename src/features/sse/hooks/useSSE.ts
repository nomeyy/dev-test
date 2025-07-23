"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/trpc/react";
import type { UseSSEOptions, UseSSEReturn, SSEEventUnion } from "../types";
import { SSEEventType } from "../types";

/**
 * React hook for managing SSE connections
 * Provides automatic reconnection, error handling, and event management
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    userId,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
    onEvent,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEventUnion | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const buildSSEUrl = useCallback(() => {
    const baseUrl = "/api/sse";
    const params = new URLSearchParams();

    if (userId) {
      params.append("userId", userId);
    }

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }, [userId]);

  const handleEvent = useCallback(
    (event: SSEEventUnion) => {
      setLastEvent(event);
      onEvent?.(event);
    },
    [onEvent],
  );

  const handleError = useCallback(
    (err: Error) => {
      setError(err);
      setIsConnected(false);
      onError?.(err);
    },
    [onError],
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const url = buildSSEUrl();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSource.onerror = () => {
        const err = new Error("SSE connection error");
        handleError(err);
        setIsConnecting(false);

        // Auto-reconnect logic
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (
              !eventSourceRef.current ||
              eventSourceRef.current.readyState === EventSource.CLOSED
            ) {
              connect();
            }
          }, reconnectInterval);
        }
      };

      // Handle connection established event
      eventSource.addEventListener("connected", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as {
            connectionId: string;
          };
          setConnectionId(data.connectionId);
        } catch (err) {
          console.warn("Failed to parse connection event:", err);
        }
      });

      // Handle ping events (heartbeat)
      eventSource.addEventListener(SSEEventType.PING, (event: MessageEvent) => {
        try {
          const pingEvent = JSON.parse(event.data as string) as SSEEventUnion;
          // Don't trigger onEvent for ping events, just update lastEvent
          setLastEvent(pingEvent);
        } catch (err) {
          console.warn("Failed to parse ping event:", err);
        }
      });

      // Handle notification events
      eventSource.addEventListener(
        SSEEventType.NOTIFICATION,
        (event: MessageEvent) => {
          try {
            const notificationEvent = JSON.parse(
              event.data as string,
            ) as SSEEventUnion;
            handleEvent(notificationEvent);
          } catch (err) {
            console.warn("Failed to parse notification event:", err);
          }
        },
      );

      // Handle user update events
      eventSource.addEventListener(
        SSEEventType.USER_UPDATE,
        (event: MessageEvent) => {
          try {
            const userUpdateEvent = JSON.parse(
              event.data as string,
            ) as SSEEventUnion;
            handleEvent(userUpdateEvent);
          } catch (err) {
            console.warn("Failed to parse user update event:", err);
          }
        },
      );

      // Handle reel upload status events
      eventSource.addEventListener(
        SSEEventType.REEL_UPLOAD_STATUS,
        (event: MessageEvent) => {
          try {
            const reelEvent = JSON.parse(event.data as string) as SSEEventUnion;
            handleEvent(reelEvent);
          } catch (err) {
            console.warn("Failed to parse reel upload event:", err);
          }
        },
      );

      // Handle system message events
      eventSource.addEventListener(
        SSEEventType.SYSTEM_MESSAGE,
        (event: MessageEvent) => {
          try {
            const systemEvent = JSON.parse(
              event.data as string,
            ) as SSEEventUnion;
            handleEvent(systemEvent);
          } catch (err) {
            console.warn("Failed to parse system message event:", err);
          }
        },
      );

      // Simple approach: Add a wildcard listener that catches all events
      // We'll add listeners for common custom event patterns
      const customEventHandler = (event: MessageEvent) => {
        try {
          const sseEvent = JSON.parse(event.data as string) as SSEEventUnion;
          console.log("🎯 Custom SSE event received:", {
            type: sseEvent.type,
            data: sseEvent.data,
            fullEvent: sseEvent,
          });
          handleEvent(sseEvent);
        } catch (err) {
          console.warn("Failed to parse custom SSE event:", err);
        }
      };

      // Store reference to original addEventListener for dynamic listener addition
      const originalAddEventListener =
        eventSource.addEventListener.bind(eventSource);

      // Track dynamically added listeners
      const dynamicListeners = new Set<string>();

      // Function to dynamically add event listener for any event type
      const addDynamicListener = (eventType: string) => {
        if (!dynamicListeners.has(eventType)) {
          console.log("🔧 Adding dynamic listener for event type:", eventType);
          originalAddEventListener(eventType, customEventHandler);
          dynamicListeners.add(eventType);
        }
      };

      // Add listeners for potential custom event types
      // Since we can't predict all custom event names, we'll add some common ones
      const potentialCustomEvents = [
        "system",
        "custom",
        "test",
        "debug",
        "alert",
        "update",
        "status",
        "event",
        "data",
        "info",
        "warning",
      ];

      potentialCustomEvents.forEach((eventType) => {
        addDynamicListener(eventType);
      });

      // Expose the dynamic listener function globally for testing
      if (typeof window !== "undefined") {
        (
          window as typeof window & {
            addSSEListener: typeof addDynamicListener;
          }
        ).addSSEListener = addDynamicListener;
      }

      // Also add a generic message listener as fallback
      eventSource.addEventListener("message", (event: MessageEvent) => {
        try {
          const sseEvent = JSON.parse(event.data as string) as SSEEventUnion;

          console.log("📨 Generic message event received:", {
            type: sseEvent.type,
            data: sseEvent.data,
            fullEvent: sseEvent,
          });

          // Only handle if it's not a predefined type (to avoid duplicates)
          const predefinedTypes = [
            SSEEventType.PING,
            SSEEventType.NOTIFICATION,
            SSEEventType.USER_UPDATE,
            SSEEventType.REEL_UPLOAD_STATUS,
            SSEEventType.SYSTEM_MESSAGE,
          ];

          if (!predefinedTypes.includes(sseEvent.type as SSEEventType)) {
            console.log(
              "🚀 Handling custom event via fallback:",
              sseEvent.type,
            );
            handleEvent(sseEvent);
          } else {
            console.log("⏭️ Skipping predefined event type:", sseEvent.type);
          }
        } catch (err) {
          console.warn("Failed to parse fallback SSE event:", err);
        }
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to create SSE connection");
      handleError(error);
      setIsConnecting(false);
    }
  }, [
    buildSSEUrl,
    isConnecting,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    onConnect,
    handleError,
    handleEvent,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionId(null);
    reconnectAttemptsRef.current = 0;
    onDisconnect?.();
  }, [onDisconnect]);

  // Type assertion for tRPC client - the API is working but showing type errors
  // This is a temporary workaround for tRPC type generation issues
  const sendTestEventMutation = (
    api as {
      sse: {
        sendTestEvent: {
          useMutation: () => {
            mutateAsync: (params: {
              type: SSEEventType;
              connectionId?: string;
              data?: Record<string, unknown>;
            }) => Promise<unknown>;
          };
        };
      };
    }
  ).sse.sendTestEvent.useMutation();

  const sendTestEvent = useCallback(
    async (type: SSEEventType, data?: Record<string, unknown>) => {
      if (!connectionId) {
        throw new Error("No active SSE connection");
      }

      try {
        const result = await sendTestEventMutation.mutateAsync({
          type,
          connectionId,
          data,
        });

        console.log("Test event sent successfully:", result);
      } catch (error) {
        console.error("Failed to send test event:", error);
        throw error;
      }
    },
    [connectionId, sendTestEventMutation],
  );

  // Auto-connect on mount if userId is provided
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId, not connect/disconnect to avoid infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is intentional for cleanup on unmount only

  return {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    connectionId,
    connect,
    disconnect,
    sendTestEvent,
  };
}
