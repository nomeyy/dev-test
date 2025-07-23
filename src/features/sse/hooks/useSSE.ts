"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseSSEOptions {
  /**
   * Custom client ID. If not provided, a random UUID will be generated.
   */
  clientId?: string;

  /**
   * User ID to associate with this connection
   */
  userId?: string;

  /**
   * Session ID to associate with this connection
   */
  sessionId?: string;

  /**
   * Whether to automatically reconnect on connection loss
   */
  autoReconnect?: boolean;

  /**
   * Reconnection delay in milliseconds
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts
   */
  maxReconnectAttempts?: number;

  /**
   * Callback fired when connection is established
   */
  onConnect?: () => void;

  /**
   * Callback fired when connection is lost
   */
  onDisconnect?: () => void;

  /**
   * Callback fired when an error occurs
   */
  onError?: (error: Event) => void;
}

export interface SSEState {
  connectionState: "disconnected" | "connecting" | "connected" | "error";
  lastEvent: MessageEvent | null;
  lastData: unknown | null;
  events: MessageEvent[];
  error: Event | null;
}

const generateClientId = () => {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook for managing Server-Sent Events connections
 */
export function useSSE({
  clientId = generateClientId(),
  userId,
  sessionId,
  autoReconnect = false, // Disabled by default to prevent loops
  reconnectDelay = 5000, // Longer delay
  maxReconnectAttempts = 3, // Fewer attempts
  onConnect,
  onDisconnect,
  onError,
}: UseSSEOptions = {}): SSEState & {
  connect: () => void;
  disconnect: () => void;
} {
  const [state, setState] = useState<SSEState>({
    connectionState: "disconnected",
    lastEvent: null,
    lastData: null,
    events: [],
    error: null,
  });

  // Use refs to store values and avoid useCallback dependencies
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Store option values in refs to avoid dependencies
  const clientIdRef = useRef(clientId);
  const userIdRef = useRef(userId);
  const sessionIdRef = useRef(sessionId);
  const autoReconnectRef = useRef(autoReconnect);
  const reconnectDelayRef = useRef(reconnectDelay);
  const maxReconnectAttemptsRef = useRef(maxReconnectAttempts);

  // Store callback refs
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Update refs when props change
  useEffect(() => {
    clientIdRef.current = clientId;
    userIdRef.current = userId;
    sessionIdRef.current = sessionId;
    autoReconnectRef.current = autoReconnect;
    reconnectDelayRef.current = reconnectDelay;
    maxReconnectAttemptsRef.current = maxReconnectAttempts;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  });

  const connect = useCallback(() => {
    // Prevent multiple concurrent connections
    if (
      !isMountedRef.current ||
      isConnectingRef.current ||
      eventSourceRef.current
    ) {
      return;
    }

    isConnectingRef.current = true;
    setState((prev) => ({
      ...prev,
      connectionState: "connecting",
      error: null,
    }));

    // Build SSE URL with parameters using refs
    const url = new URL("/api/sse", window.location.origin);
    if (clientIdRef.current)
      url.searchParams.set("clientId", clientIdRef.current);
    if (userIdRef.current) url.searchParams.set("userId", userIdRef.current);
    if (sessionIdRef.current)
      url.searchParams.set("sessionId", sessionIdRef.current);

    console.log(`[SSE] Connecting to: ${url.toString()}`);
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!isMountedRef.current) return;

      console.log("[SSE] Connection opened");
      setState((prev) => ({
        ...prev,
        connectionState: "connected",
        error: null,
      }));

      reconnectAttemptsRef.current = 0;
      isConnectingRef.current = false;
      onConnectRef.current?.();
    };

    eventSource.onmessage = (event) => {
      if (!isMountedRef.current) return;

      console.log("[SSE] Received message:", event.data);
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(event.data);
      } catch {
        parsedData = event.data;
      }

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: parsedData,
        events: [...prev.events.slice(-99), event], // Keep last 100 events
      }));
    };

    eventSource.onerror = (error) => {
      if (!isMountedRef.current) return;

      console.error("[SSE] Connection error:", error);
      isConnectingRef.current = false;

      setState((prev) => ({
        ...prev,
        connectionState: "error",
        error: error,
      }));

      onErrorRef.current?.(error);

      // Close the failed connection
      eventSource.close();
      eventSourceRef.current = null;

      // Only auto-reconnect if explicitly enabled and within limit
      if (
        autoReconnectRef.current &&
        reconnectAttemptsRef.current < maxReconnectAttemptsRef.current
      ) {
        reconnectAttemptsRef.current++;
        console.log(
          `[SSE] Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current} in ${reconnectDelayRef.current}ms`,
        );

        // Add exponential backoff to delay
        const backoffDelay =
          reconnectDelayRef.current *
          Math.pow(2, reconnectAttemptsRef.current - 1);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && autoReconnectRef.current) {
            connect();
          }
        }, backoffDelay);
      } else {
        console.log(
          "[SSE] Max reconnect attempts reached or auto-reconnect disabled",
        );
        setState((prev) => ({ ...prev, connectionState: "disconnected" }));
        onDisconnectRef.current?.();
      }
    };

    // Handle specific SSE events - update state for UI display
    eventSource.addEventListener("connected", (event) => {
      console.log("[SSE] Connection confirmed:", event.data);
      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });

    eventSource.addEventListener("heartbeat", (event) => {
      try {
        const data = JSON.parse(event.data) as { timestamp: string };
        console.log("[SSE] Heartbeat:", data.timestamp);
      } catch {
        console.log("[SSE] Heartbeat:", event.data);
      }

      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: event.data,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });

    eventSource.addEventListener("notification", (event) => {
      try {
        const notification = JSON.parse(event.data) as Record<string, unknown>;
        console.log("[SSE] Notification:", notification);
      } catch {
        console.log("[SSE] Notification:", event.data);
      }

      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: event.data,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });

    // Handle other event types
    eventSource.addEventListener("announcement", (event) => {
      console.log("[SSE] Announcement:", event.data);
      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: event.data,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });

    eventSource.addEventListener("update", (event) => {
      console.log("[SSE] Update:", event.data);
      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: event.data,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });

    eventSource.addEventListener("broadcast", (event) => {
      console.log("[SSE] Broadcast:", event.data);
      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: event.data,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });

    // Catch-all for any other event types
    eventSource.addEventListener("message", (event) => {
      console.log("[SSE] Generic message:", event.data);
      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        lastEvent: event,
        lastData: event.data,
        events: [...prev.events.slice(-99), event], // Add to events list
      }));
    });
  }, []); // Empty deps to prevent infinite loops

  const disconnect = useCallback(() => {
    console.log("[SSE] Disconnecting...");
    isConnectingRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, connectionState: "disconnected" }));
      onDisconnectRef.current?.();
    }
  }, []);

  // Cleanup on unmount - do NOT auto-connect
  useEffect(() => {
    isMountedRef.current = true;

    // DO NOT auto-connect - only connect when manually called
    console.log("[SSE] Hook mounted - NOT auto-connecting");

    return () => {
      isMountedRef.current = false;
      console.log("[SSE] Hook unmounting - cleaning up");
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
