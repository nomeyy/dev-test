"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/utils/logging";
import type { SSEEvent, SSEConnectionOptions } from "../types";

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: SSEEvent | null;
  reconnectAttempts: number;
}

export interface SSEHookOptions extends SSEConnectionOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useSSE(
  url: string,
  options: SSEHookOptions = {},
): SSEConnectionState & {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (event: string, data: any) => void;
} {
  const {
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    ...connectionOptions
  } = options;

  const [state, setState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const buildUrl = useCallback(() => {
    const urlObj = new URL(url, window.location.origin);

    // Add connection options as query parameters
    if (connectionOptions.userId) {
      urlObj.searchParams.set("userId", connectionOptions.userId);
    }
    if (connectionOptions.sessionId) {
      urlObj.searchParams.set("sessionId", connectionOptions.sessionId);
    }
    if (connectionOptions.metadata) {
      urlObj.searchParams.set(
        "metadata",
        JSON.stringify(connectionOptions.metadata),
      );
    }
    if (connectionOptions.heartbeatInterval) {
      urlObj.searchParams.set(
        "heartbeatInterval",
        connectionOptions.heartbeatInterval.toString(),
      );
    }
    if (connectionOptions.maxReconnectTime) {
      urlObj.searchParams.set(
        "maxReconnectTime",
        connectionOptions.maxReconnectTime.toString(),
      );
    }

    return urlObj.toString();
  }, [url, connectionOptions]);

  const connect = useCallback(() => {
    if (state.isConnected || state.isConnecting) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const fullUrl = buildUrl();
      const eventSource = new EventSource(fullUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }));
        reconnectAttemptsRef.current = 0;
        onConnect?.();
        logger.info("SSE-Client", "Connected to SSE endpoint");
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = {
            event: event.type || "message",
            data: event.data ? JSON.parse(event.data) : null,
            timestamp: Date.now(),
          };

          setState((prev) => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          logger.error("SSE-Client", "Failed to parse SSE message", error);
        }
      };

      eventSource.onerror = (error) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: "Connection error",
        }));

        onError?.(error);
        logger.error("SSE-Client", "SSE connection error", error);

        // Handle reconnection
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          setState((prev) => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            logger.info(
              "SSE-Client",
              `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
            );
            connect();
          }, reconnectDelay * reconnectAttemptsRef.current);
        }
      };

      // Handle custom events
      eventSource.addEventListener("notification", (event) => {
        try {
          const sseEvent: SSEEvent = {
            event: "notification",
            data: event.data ? JSON.parse(event.data) : null,
            timestamp: Date.now(),
          };
          setState((prev) => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          logger.error(
            "SSE-Client",
            "Failed to parse notification event",
            error,
          );
        }
      });

      eventSource.addEventListener("status_update", (event) => {
        try {
          const sseEvent: SSEEvent = {
            event: "status_update",
            data: event.data ? JSON.parse(event.data) : null,
            timestamp: Date.now(),
          };
          setState((prev) => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          logger.error(
            "SSE-Client",
            "Failed to parse status_update event",
            error,
          );
        }
      });

      eventSource.addEventListener("data_sync", (event) => {
        try {
          const sseEvent: SSEEvent = {
            event: "data_sync",
            data: event.data ? JSON.parse(event.data) : null,
            timestamp: Date.now(),
          };
          setState((prev) => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          logger.error("SSE-Client", "Failed to parse data_sync event", error);
        }
      });

      eventSource.addEventListener("system_alert", (event) => {
        try {
          const sseEvent: SSEEvent = {
            event: "system_alert",
            data: event.data ? JSON.parse(event.data) : null,
            timestamp: Date.now(),
          };
          setState((prev) => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          logger.error(
            "SSE-Client",
            "Failed to parse system_alert event",
            error,
          );
        }
      });

      eventSource.addEventListener("heartbeat", (event) => {
        try {
          const sseEvent: SSEEvent = {
            event: "heartbeat",
            data: event.data ? JSON.parse(event.data) : null,
            timestamp: Date.now(),
          };
          // Don't update lastEvent for heartbeats
          onMessage?.(sseEvent);
        } catch (error) {
          logger.error("SSE-Client", "Failed to parse heartbeat event", error);
        }
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "Failed to create connection",
      }));
      logger.error("SSE-Client", "Failed to create SSE connection", error);
    }
  }, [
    state.isConnected,
    state.isConnecting,
    buildUrl,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
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
      reconnectAttempts: 0,
    }));

    reconnectAttemptsRef.current = 0;
    onDisconnect?.();
    logger.info("SSE-Client", "Disconnected from SSE endpoint");
  }, [onDisconnect]);

  const sendMessage = useCallback((event: string, data: any) => {
    // Note: SSE is server-to-client only, so this is just for logging
    logger.info("SSE-Client", `Would send message: ${event}`, data);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
    sendMessage,
  };
}
