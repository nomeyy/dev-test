"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/utils/logging";

const sseLogger = logger.createContextLogger("SSE");

export interface SSEEvent {
  event: string;
  data: any;
  timestamp: number;
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: SSEEvent | null;
}

export interface UseSSEOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: (event: SSEEvent) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = "/api/sse",
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [state, setState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current || state.isConnecting) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectAttemptsRef.current = 0;
        sseLogger.info("Connected to server");
      };

      eventSource.onerror = (error) => {
        sseLogger.error("Connection error", error);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: "Connection failed",
        }));

        onError?.(error);
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            sseLogger.info(
              `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
            );
            connect();
          }, reconnectInterval);
        } else {
          setState((prev) => ({
            ...prev,
            error: "Max reconnection attempts reached",
          }));
        }
      };

      // Generic event listener for all events
      const handleEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            event: event.type || "message",
            data,
            timestamp: Date.now(),
          };

          setState((prev) => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);

          // Handle special events
          if (event.type === "connected") {
            onConnect?.(sseEvent);
          }
        } catch (error) {
          sseLogger.error("Failed to parse event", error);
        }
      };

      // Add listeners for specific event types
      eventSource.addEventListener("ping", handleEvent);
      eventSource.addEventListener("error", handleEvent);
      eventSource.addEventListener("test-message", handleEvent);
      eventSource.addEventListener("connected", handleEvent);
      // Add listener for any other events
      eventSource.addEventListener("message", handleEvent);
    } catch (error) {
      sseLogger.error("Failed to create connection", error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "Failed to create connection",
      }));
    }
  }, [
    url,
    reconnectInterval,
    maxReconnectAttempts,
    onConnect,
    onError,
    onMessage,
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

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));

    onDisconnect?.();
    sseLogger.info("Disconnected from server");
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Store function references to avoid dependency issues
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);

  // Update refs when functions change
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    if (autoConnect) {
      connectRef.current();
    }

    return () => {
      disconnectRef.current();
    };
  }, [autoConnect]); // Use refs to avoid dependency issues

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
  };
}
