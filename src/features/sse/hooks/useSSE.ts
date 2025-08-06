"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent } from "../types";

interface UseSSEOptions {
  url?: string;
  userId?: string;
  sessionId?: string;
  onMessage?: (event: SSEEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastMessage: SSEEvent | null;
  connect: () => void;
  disconnect: () => void;
  error: string | null;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = "/api/sse",
    userId,
    sessionId,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (eventSourceRef.current || hasConnectedRef.current) {
      return; // Already connected or has connected
    }

    // Build URL with query parameters
    const urlObj = new URL(url, window.location.origin);
    if (userId) urlObj.searchParams.set("userId", userId);
    if (sessionId) urlObj.searchParams.set("sessionId", sessionId);

    try {
      const eventSource: EventSource = new EventSource(urlObj.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        hasConnectedRef.current = true;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: event.type || "message",
            data,
          };

          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse SSE message:", parseError);
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        setError("SSE connection error");
        onError?.(event);
      };

      // Handle specific event types
      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: "connected",
            data,
          };
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse connection message:", parseError);
        }
      });

      eventSource.addEventListener("ping", (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: "ping",
            data,
          };
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse ping message:", parseError);
        }
      });

      // Add listeners for our custom event types
      eventSource.addEventListener("test-message", (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: "test-message",
            data,
          };
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse test-message:", parseError);
        }
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: "notification",
            data,
          };
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse notification:", parseError);
        }
      });

      eventSource.addEventListener("test", (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: "test",
            data,
          };
          setLastMessage(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse test event:", parseError);
        }
      });
    } catch (err) {
      setError("Failed to create SSE connection");
      console.error("SSE connection error:", err);
    }
  }, [url, userId, sessionId]); // Remove callback dependencies

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    hasConnectedRef.current = false;
    onDisconnect?.();
  }, []); // Remove callback dependency

  useEffect(() => {
    // Auto-connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array to run only once

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    error,
  };
}
