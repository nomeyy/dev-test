// features/sse/useSSE.ts
import { useEffect, useState, useCallback, useRef } from "react";

type SSEState = "connecting" | "open" | "closed" | "error";
type SSEEvent = MessageEvent;

interface SSEHandlers {
  [eventName: string]: (event: SSEEvent) => void;
}

interface UseSSEOptions {
  clientId?: string;
  userId?: string;
  sessionId?: string;
  handlers: SSEHandlers;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  onStateChange?: (state: SSEState) => void;
  maxRetries?: number;
  retryDelay?: number;
  autoReconnect?: boolean;
  heartbeatTimeout?: number;
}

interface SSEHookReturn {
  sseState: SSEState;
  retryCount: number;
  isConnected: boolean;
  lastHeartbeat?: Date;
  resetConnection: () => void;
  disconnect: () => void;
  sendEvent: (
    event: string,
    data: unknown,
    target?: {
      type: "client" | "user" | "session" | "broadcast";
      id?: string;
    },
  ) => Promise<boolean>;
}

/**
 * Enhanced SSE hook with improved connection management, stats tracking,
 * and utility functions for sending events.
 * This hook supports automatic reconnection, heartbeat management,
 * and allows sending events to specific clients .
 */
export function useSSE(options: UseSSEOptions): SSEHookReturn {
  const {
    clientId,
    userId,
    sessionId,
    handlers,
    onError,
    onReconnect,
    onStateChange,
    maxRetries = 5,
    retryDelay = 1000,
    autoReconnect = true,
    heartbeatTimeout = 35000, // 35 seconds (heartbeat is every 20s)
  } = options;

  const [sseState, setSseState] = useState<SSEState>("closed");
  const [retryCount, setRetryCount] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>();

  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isManualDisconnect = useRef(false);

  // Update state and notify parent
  const updateState = useCallback(
    (newState: SSEState) => {
      setSseState(newState);
      onStateChange?.(newState);
    },
    [onStateChange],
  );

  // Reset heartbeat timeout
  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current && !isManualDisconnect.current) {
        console.warn("SSE: Heartbeat timeout detected, reconnecting...");
        eventSourceRef.current.close();
        updateState("error");
      }
    }, heartbeatTimeout);
  }, [heartbeatTimeout, updateState]);

  // Build SSE URL
  const buildSSEUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId);
    if (userId) params.append("userId", userId);
    if (sessionId) params.append("sessionId", sessionId);

    return `/api/sse?${params.toString()}`;
  }, [clientId, userId, sessionId]);

  // Connect function
  const connect = useCallback(() => {
    if (isManualDisconnect.current) return;
    if (retryCount >= maxRetries && maxRetries > 0) {
      updateState("error");
      return;
    }

    const url = buildSSEUrl();
    const es = new EventSource(url);
    eventSourceRef.current = es;
    updateState("connecting");

    es.onerror = (event) => {
      updateState("error");
      onError?.(event);

      // Clear heartbeat timeout on error
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }

      if (
        !isManualDisconnect.current &&
        autoReconnect &&
        retryCount < maxRetries
      ) {
        const delay = Math.min(retryDelay * Math.pow(2, retryCount), 30000);
        onReconnect?.(retryCount + 1);

        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          connect();
        }, delay);
      } else if (!autoReconnect || retryCount >= maxRetries) {
        updateState("closed");
      }
    };

    // Handle heartbeat specially
    es.addEventListener("heartbeat", (event) => {
      setLastHeartbeat(new Date());
      resetHeartbeatTimeout();

      // Call user handler if provided
      if (handlers.heartbeat) {
        handlers.heartbeat(event as MessageEvent);
      }
    });

    // Register all other event handlers
    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (eventName !== "heartbeat") {
        es.addEventListener(eventName, handler as EventListener);
      }
    });

    return es;
  }, [
    clientId,
    userId,
    sessionId,
    handlers,
    maxRetries,
    retryDelay,
    autoReconnect,
    onError,
    onReconnect,
    retryCount,
    updateState,
    resetHeartbeatTimeout,
    buildSSEUrl,
  ]);

  // Disconnect function
  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    updateState("closed");
  }, [updateState]);

  // Reset connection
  const resetConnection = useCallback(() => {
    disconnect();
    setRetryCount(0);
    isManualDisconnect.current = false;

    // Small delay to ensure cleanup
    setTimeout(() => {
      if (!isManualDisconnect.current) {
        connect();
      }
    }, 100);
  }, [disconnect, connect]);

  // Send event utility function
  const sendEvent = useCallback(
    async (
      event: string,
      data: unknown,
      target?: {
        type: "client" | "user" | "session" | "broadcast";
        id?: string;
      },
    ): Promise<boolean> => {
      try {
        const payload = target
          ? { event, data, target }
          : {
              event,
              data,
              // Use current connection info as defaults
              clientId:
                target?.type === "client" ? target.id || clientId : undefined,
              userId: target?.type === "user" ? target.id || userId : undefined,
              sessionId:
                target?.type === "session" ? target.id || sessionId : undefined,
            };

        const response = await fetch("/api/sse/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        return result.success || false;
      } catch (error) {
        console.error("Failed to send SSE event:", error);
        return false;
      }
    },
    [clientId, userId, sessionId],
  );

  // Initial connection
  useEffect(() => {
    isManualDisconnect.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Update handlers when they change
  useEffect(() => {
    if (!eventSourceRef.current) return;

    const es = eventSourceRef.current;

    // Remove old handlers (except heartbeat which is handled specially)
    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (eventName !== "heartbeat") {
        es.removeEventListener(eventName, handler as EventListener);
      }
    });

    // Add new handlers
    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (eventName !== "heartbeat") {
        es.addEventListener(eventName, handler as EventListener);
      }
    });
  }, [handlers]);

  return {
    sseState,
    retryCount,
    isConnected: sseState === "open",
    lastHeartbeat,
    resetConnection,
    disconnect,
    sendEvent,
  };
}
