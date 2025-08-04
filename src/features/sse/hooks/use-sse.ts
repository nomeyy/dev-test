"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SSEHookOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
  timestamp?: string;
}

export interface SSEHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: SSEEvent | null;
  error: string | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (
    eventType: string,
    handler: (event: SSEEvent) => void,
  ) => () => void;
}

export function useSSE(options: SSEHookOptions = {}): SSEHookResult {
  const {
    userId,
    sessionId,
    metadata = {},
    autoReconnect = true,
    reconnectInterval = 5000, // Increased from 3000ms to 5000ms
    maxReconnectAttempts = 10, // Increased from 5 to 10
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(
    new Map(),
  );
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to store current option values to avoid stale closures
  const optionsRef = useRef({
    userId,
    sessionId,
    metadata,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  });
  optionsRef.current = {
    userId,
    sessionId,
    metadata,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  };

  const buildSSEUrl = useCallback(() => {
    const {
      userId: currentUserId,
      sessionId: currentSessionId,
      metadata: currentMetadata,
    } = optionsRef.current;
    const params = new URLSearchParams();

    if (currentUserId) params.set("userId", currentUserId);
    if (currentSessionId) params.set("sessionId", currentSessionId);

    for (const [key, value] of Object.entries(currentMetadata)) {
      params.set(key, value);
    }

    return `/api/sse?${params.toString()}`;
  }, []); // Empty dependency array - all dependencies are in refs

  const triggerEventListeners = useCallback(
    (eventType: string, event: SSEEvent) => {
      const listeners = eventListenersRef.current.get(eventType);
      if (listeners) {
        listeners.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            console.error("Error in SSE event handler:", error);
          }
        });
      }
    },
    [],
  );

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    // Close any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Build URL with current values from ref
      const {
        userId: currentUserId,
        sessionId: currentSessionId,
        metadata: currentMetadata,
      } = optionsRef.current;
      const params = new URLSearchParams();
      if (currentUserId) params.set("userId", currentUserId);
      if (currentSessionId) params.set("sessionId", currentSessionId);
      for (const [key, value] of Object.entries(currentMetadata)) {
        params.set(key, value);
      }
      const url = `/api/sse?${params.toString()}`;

      console.log("SSE: Connecting to", url);
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE connection opened successfully");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        setReconnectAttempts(0);
      };

      eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);
        setIsConnected(false);
        setIsConnecting(false);
        setError("Connection error");

        // Get current options from ref
        const {
          autoReconnect: currentAutoReconnect,
          reconnectInterval: currentReconnectInterval,
          maxReconnectAttempts: currentMaxAttempts,
        } = optionsRef.current;

        // Only reconnect if we have auto-reconnect enabled and haven't exceeded max attempts
        setReconnectAttempts((currentAttempts) => {
          if (currentAutoReconnect && currentAttempts < currentMaxAttempts) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }

            // Exponential backoff: base interval * 2^attempts, capped at 30 seconds
            const backoffDelay = Math.min(
              currentReconnectInterval * Math.pow(2, currentAttempts),
              30000,
            );

            console.log(
              `SSE reconnecting in ${backoffDelay}ms (attempt ${currentAttempts + 1}/${currentMaxAttempts})`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, backoffDelay);

            return currentAttempts + 1;
          } else if (currentAttempts >= currentMaxAttempts) {
            setError("Maximum reconnection attempts reached");
            console.warn("SSE: Maximum reconnection attempts reached");
          }
          return currentAttempts;
        });
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            event: event.type || undefined,
            data,
            id: event.lastEventId || undefined,
            timestamp: new Date().toISOString(),
          };

          setLastEvent(sseEvent);
          triggerEventListeners("message", sseEvent);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      // Handle named events
      const handleNamedEvent = (eventType: string) => (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            event: eventType,
            data,
            id: event.lastEventId || undefined,
            timestamp: new Date().toISOString(),
          };

          setLastEvent(sseEvent);
          triggerEventListeners(eventType, sseEvent);
        } catch (error) {
          console.error(`Failed to parse ${eventType} event:`, error);
        }
      };

      // Listen for common event types
      eventSource.addEventListener("connected", handleNamedEvent("connected"));
      eventSource.addEventListener("ping", handleNamedEvent("ping"));
      eventSource.addEventListener("demo", handleNamedEvent("demo"));
      eventSource.addEventListener("system", handleNamedEvent("system"));
      eventSource.addEventListener("update", handleNamedEvent("update"));
      eventSource.addEventListener("progress", handleNamedEvent("progress"));
      eventSource.addEventListener("success", handleNamedEvent("success"));
      eventSource.addEventListener("error", handleNamedEvent("error"));
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      setIsConnecting(false);
      setError("Failed to create connection");
    }
  }, []); // Empty dependency array - all dependencies are in refs

  const disconnect = useCallback(() => {
    console.log("SSE: Disconnecting...");

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
    setReconnectAttempts(0);
  }, []);

  const addEventListener = useCallback(
    (eventType: string, handler: (event: SSEEvent) => void) => {
      if (!eventListenersRef.current.has(eventType)) {
        eventListenersRef.current.set(eventType, new Set());
      }

      const listeners = eventListenersRef.current.get(eventType)!;
      listeners.add(handler);

      // Return cleanup function
      return () => {
        listeners.delete(handler);
        if (listeners.size === 0) {
          eventListenersRef.current.delete(eventType);
        }
      };
    },
    [],
  );

  // Auto-connect on mount only
  useEffect(() => {
    let mounted = true;

    const connectIfMounted = () => {
      if (mounted) {
        connect();
      }
    };

    connectIfMounted();

    // Cleanup on unmount
    return () => {
      mounted = false;
      disconnect();
    };
  }, []); // Empty dependency array to prevent infinite loops

  return {
    isConnected,
    isConnecting,
    lastEvent,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    addEventListener,
  };
}
