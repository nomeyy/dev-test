"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("useSSE");

export interface SSEOptions {
  userId?: string;
  sessionId?: string;
  onMessage?: (event: MessageEvent) => void;
  onNotification?: (data: any) => void;
  onUploadProgress?: (data: any) => void;
  onAssetReady?: (data: any) => void;
  onUserUpdate?: (data: any) => void;
  onHeartbeat?: () => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * React hook for Server-Sent Events (SSE) connection
 * Provides a clean interface for connecting to the SSE stream and handling events
 */
export function useSSE(options: SSEOptions = {}) {
  const {
    userId,
    sessionId,
    onMessage,
    onNotification,
    onUploadProgress,
    onAssetReady,
    onUserUpdate,
    onHeartbeat,
    onOpen,
    onError,
    onClose,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  // Use refs to store callback functions to prevent re-creation
  const callbacksRef = useRef({
    onMessage,
    onNotification,
    onUploadProgress,
    onAssetReady,
    onUserUpdate,
    onHeartbeat,
    onOpen,
    onError,
    onClose,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onNotification,
      onUploadProgress,
      onAssetReady,
      onUserUpdate,
      onHeartbeat,
      onOpen,
      onError,
      onClose,
    };
  }, [
    onMessage,
    onNotification,
    onUploadProgress,
    onAssetReady,
    onUserUpdate,
    onHeartbeat,
    onOpen,
    onError,
    onClose,
  ]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  // Build SSE URL with query parameters
  const buildSSEUrl = useCallback(() => {
    const url = new URL("/api/sse", window.location.origin);
    if (userId) url.searchParams.set("userId", userId);
    if (sessionId) url.searchParams.set("sessionId", sessionId);
    return url.toString();
  }, [userId, sessionId]);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const url = buildSSEUrl();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }));
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onOpen?.();
        log.info("SSE connection established", { url });
      };

      // Connection error
      eventSource.onerror = (error) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: "Connection error",
        }));
        callbacksRef.current.onError?.(error);
        log.error("SSE connection error", error);

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setState((prev) => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      // General message handler
      eventSource.onmessage = (event) => {
        callbacksRef.current.onMessage?.(event);
        log.debug("SSE message received", { data: event.data });
        console.log("SSE message received:", event.data);
      };

      // Specific event handlers
      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data);
          log.debug("SSE notification received", { data });
          callbacksRef.current.onNotification?.(data);
        } catch (error) {
          log.error("Failed to parse notification data", error);
        }
      });

      eventSource.addEventListener("upload_progress", (event) => {
        try {
          const data = JSON.parse(event.data);
          log.debug("SSE upload progress received", { data });
          callbacksRef.current.onUploadProgress?.(data);
        } catch (error) {
          log.error("Failed to parse upload progress data", error);
        }
      });

      eventSource.addEventListener("asset_ready", (event) => {
        try {
          const data = JSON.parse(event.data);
          log.debug("SSE asset ready received", { data });
          callbacksRef.current.onAssetReady?.(data);
        } catch (error) {
          log.error("Failed to parse asset ready data", error);
        }
      });

      eventSource.addEventListener("user_update", (event) => {
        try {
          const data = JSON.parse(event.data);
          log.debug("SSE user update received", { data });
          callbacksRef.current.onUserUpdate?.(data);
        } catch (error) {
          log.error("Failed to parse user update data", error);
        }
      });

      eventSource.addEventListener("heartbeat", (event) => {
        callbacksRef.current.onHeartbeat?.();
        log.debug("SSE heartbeat received");
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: "Failed to create SSE connection",
      }));
      log.error("Failed to create SSE connection", error);
    }
  }, [buildSSEUrl, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from SSE stream
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

    callbacksRef.current.onClose?.();
    log.info("SSE connection closed");
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - only run on mount

  // Reconnect when userId or sessionId changes
  useEffect(() => {
    if (state.isConnected && (userId || sessionId)) {
      // Only reconnect if the connection parameters actually changed
      const currentUrl = buildSSEUrl();
      if (eventSourceRef.current?.url !== currentUrl) {
        disconnect();
        // Small delay to prevent immediate reconnection
        setTimeout(() => {
          connect();
        }, 100);
      }
    }
  }, [userId, sessionId]); // Only depend on userId and sessionId

  return {
    ...state,
    connect,
    disconnect,
  };
}
