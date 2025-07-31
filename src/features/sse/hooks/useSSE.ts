"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent } from "../types";

/**
 * Configuration options for the SSE hook
 */
interface UseSSEOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

/**
 * Hook for managing Server-Sent Events connections
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = "/api/sse/connect",
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isDestroyedRef = useRef(false);

  /**
   * Parse SSE event data
   */
  const parseSSEEvent = useCallback((data: string): SSEEvent | null => {
    try {
      return JSON.parse(data) as SSEEvent;
    } catch (error) {
      console.error("Failed to parse SSE event:", error);
      return null;
    }
  }, []);

  /**
   * Handle SSE message
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const sseEvent = parseSSEEvent(event.data);
      if (sseEvent) {
        setLastEvent(sseEvent);
        onMessage?.(sseEvent);
      }
    },
    [parseSSEEvent, onMessage],
  );

  /**
   * Handle SSE connection open
   */
  const handleOpen = useCallback(() => {
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
    onOpen?.();
  }, [onOpen]);

  /**
   * Handle SSE connection close
   */
  const handleClose = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    onClose?.();
  }, [onClose]);

  /**
   * Handle SSE connection error
   */
  const handleError = useCallback(
    (error: Event) => {
      setIsConnected(false);
      setIsConnecting(false);
      setError(error);
      onError?.(error);
    },
    [onError],
  );

  /**
   * Attempt to reconnect
   */
  const attemptReconnect = useCallback(() => {
    if (
      isDestroyedRef.current ||
      reconnectAttemptsRef.current >= maxReconnectAttempts
    ) {
      return;
    }

    reconnectAttemptsRef.current++;
    setIsConnecting(true);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isDestroyedRef.current) {
        void connect();
      }
    }, reconnectInterval);
  }, [reconnectInterval, maxReconnectAttempts]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (isDestroyedRef.current || eventSourceRef.current) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = handleOpen;
      eventSource.onerror = (error) => {
        handleError(error);
        if (eventSource.readyState === EventSource.CLOSED) {
          handleClose();
          attemptReconnect();
        }
      };
      eventSource.onmessage = handleMessage;
    } catch (error) {
      handleError(error as Event);
      attemptReconnect();
    }
  }, [
    url,
    handleOpen,
    handleClose,
    handleError,
    handleMessage,
    attemptReconnect,
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

    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Send a custom event (requires additional API call)
   */
  const sendEvent = useCallback(async (event: Omit<SSEEvent, "timestamp">) => {
    try {
      const response = await fetch("/api/sse/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: event.type,
          data: event.data,
          broadcast: true, // Default to broadcast
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to send SSE event:", error);
      throw error;
    }
  }, []);

  /**
   * Send event to specific user
   */
  const sendToUser = useCallback(
    async (userId: string, event: Omit<SSEEvent, "timestamp">) => {
      try {
        const response = await fetch("/api/sse/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: event.type,
            data: event.data,
            targetUserId: userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send event: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error("Failed to send SSE event to user:", error);
        throw error;
      }
    },
    [],
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      isDestroyedRef.current = true;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    connect,
    disconnect,
    sendEvent,
    sendToUser,
  };
}
