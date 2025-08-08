import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export interface SSEEvent {
  event: string;
  data: any;
  id?: string;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  onConnect?: (clientId: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEConnectionState {
  isConnected: boolean;
  clientId?: string;
  lastMessage?: SSEEvent;
  error?: string;
  reconnectAttempts: number;
}

export function useSSE(options: SSEConnectionOptions = {}) {
  const {
    userId,
    sessionId,
    metadata,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const [state, setState] = useState<SSEConnectionState>({
    isConnected: false,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Memoize the connection parameters to prevent unnecessary reconnections
  const connectionParams = useMemo(
    () => ({
      userId,
      sessionId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    }),
    [userId, sessionId, metadata],
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (connectionParams.userId)
        params.append("userId", connectionParams.userId);
      if (connectionParams.sessionId)
        params.append("sessionId", connectionParams.sessionId);
      if (connectionParams.metadata)
        params.append("metadata", connectionParams.metadata);

      const url = `/api/sse?${params.toString()}`;
      console.log("SSE: Connecting to", url);

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("SSE: Connection opened");
        isConnectingRef.current = false;
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: undefined,
        }));
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          console.log("SSE: Received message", event);

          const sseEvent: SSEEvent = {
            event: event.type,
            data: JSON.parse(event.data),
            id: event.lastEventId || undefined,
          };

          setState((prev) => ({
            ...prev,
            lastMessage: sseEvent,
          }));

          onMessage?.(sseEvent);

          // Handle connection event to get client ID
          if (sseEvent.event === "connected" && sseEvent.data?.clientId) {
            setState((prev) => ({
              ...prev,
              clientId: sseEvent.data.clientId,
            }));
            onConnect?.(sseEvent.data.clientId);
          }
        } catch (error) {
          console.error("SSE: Error parsing message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE: Connection error:", error);
        isConnectingRef.current = false;
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: "Connection error",
        }));
        onError?.(error);
        eventSource.close();
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("SSE: Error creating connection:", error);
      isConnectingRef.current = false;
      setState((prev) => ({
        ...prev,
        error: "Failed to create connection",
      }));
    }
  }, [connectionParams, onConnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isConnectingRef.current = false;

    setState((prev) => ({
      ...prev,
      isConnected: false,
    }));

    onDisconnect?.();
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log("SSE: Max reconnection attempts reached");
      setState((prev) => ({
        ...prev,
        error: "Max reconnection attempts reached",
      }));
      return;
    }

    if (isConnectingRef.current) {
      return;
    }

    reconnectAttemptsRef.current++;
    setState((prev) => ({
      ...prev,
      reconnectAttempts: reconnectAttemptsRef.current,
    }));

    console.log(
      `SSE: Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval, maxReconnectAttempts]);

  // Auto-reconnect on error (but only if we're not already connected)
  useEffect(() => {
    if (
      !state.isConnected &&
      state.error &&
      reconnectAttemptsRef.current < maxReconnectAttempts &&
      !isConnectingRef.current
    ) {
      reconnect();
    }
  }, [state.isConnected, state.error, reconnect, maxReconnectAttempts]);

  // Connect on mount (only once)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, []); // Empty dependency array to run only once

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
  };
}
