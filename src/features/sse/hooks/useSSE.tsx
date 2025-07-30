"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent } from "../types";

interface UseSSEOptions {
  url?: string;
  userId?: string;
  sessionId?: string;
  clientId?: string;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}

/**
 * React hook for consuming Server-Sent Events
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = "/api/sse",
    userId,
    sessionId,
    clientId,
    onMessage,
    onError,
    onOpen,
    onClose,
    autoReconnect = true, // Re-enable auto-reconnect
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);

  // Build the SSE URL with query parameters
  const buildSSEUrl = useCallback(() => {
    const urlObj = new URL(url, window.location.origin);
    if (userId) urlObj.searchParams.set("userId", userId);
    if (sessionId) urlObj.searchParams.set("sessionId", sessionId);
    if (clientId) urlObj.searchParams.set("clientId", clientId);
    return urlObj.toString();
  }, [url, userId, sessionId, clientId]);

  // Parse SSE message
  const parseSSEMessage = useCallback((event: MessageEvent): SSEEvent => {
    try {
      const data = event.data ? JSON.parse(event.data) : {};
      return {
        id: event.lastEventId || undefined,
        event: event.type || "message", // Use event type or default to "message"
        data,
        // Add a unique identifier for React keys
        _key: `${event.lastEventId || Date.now()}-${event.type || "message"}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      console.error("SSE: Error parsing message:", error);
      return {
        id: event.lastEventId || undefined,
        event: event.type || "message",
        data: event.data,
        _key: `${event.lastEventId || Date.now()}-${event.type || "message"}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      console.log("SSE: Raw message received:", {
        type: event.type,
        data: event.data,
        lastEventId: event.lastEventId,
        eventType: event.type, // This should show the actual event type
      });

      const sseEvent = parseSSEMessage(event);
      console.log("SSE: Parsed event:", sseEvent);

      // Handle special events
      if (sseEvent.event === "clear_events") {
        console.log("SSE: Clearing events due to server notification");
        setEvents([]);
        setLastEvent(null);
        return;
      }

      // Force immediate state updates with functional updates
      setLastEvent(() => sseEvent);
      setEvents((prev) => {
        const newEvents = [...prev, sseEvent];
        console.log(
          "SSE: Updated events array, new length:",
          newEvents.length,
          "Latest event:",
          sseEvent,
        );
        return newEvents;
      });

      // State updates will trigger re-renders automatically

      if (onMessage) {
        onMessage(sseEvent);
      }
    },
    [parseSSEMessage, onMessage],
  );

  // Handle connection open
  const handleOpen = useCallback(() => {
    console.log("SSE: Connection opened");
    setIsConnected(true);
    isConnectedRef.current = true;
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;

    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  // Handle connection close
  const handleClose = useCallback(() => {
    console.log("SSE: Connection closed");
    setIsConnected(false);
    isConnectedRef.current = false;
    isConnectingRef.current = false;

    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle errors
  const handleError = useCallback(
    (error: Event) => {
      console.error("SSE: Connection error:", error);
      setIsConnected(false);
      isConnectedRef.current = false;
      isConnectingRef.current = false;

      if (onError) {
        onError(error);
      }

      // Attempt to reconnect if auto-reconnect is enabled
      if (
        autoReconnect &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        reconnectAttemptsRef.current++;
        console.log(
          `SSE: Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`,
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    },
    [autoReconnect, maxReconnectAttempts, reconnectInterval, onError],
  );

  // Connect to SSE
  const connect = useCallback(() => {
    if (isConnectingRef.current || isConnectedRef.current) {
      return;
    }

    console.log("SSE: Establishing connection...");
    isConnectingRef.current = true;

    try {
      const sseUrl = buildSSEUrl();
      const eventSource = new EventSource(sseUrl);

      // Set up event handlers
      eventSource.onopen = handleOpen;
      eventSource.onerror = handleError;
      eventSource.onmessage = handleMessage;

      // Listen for specific event types with error handling
      const eventTypes = [
        "connected",
        "ping",
        "notification",
        "test_message",
        "message",
        "clear_events",
      ];
      eventTypes.forEach((eventType) => {
        try {
          eventSource.addEventListener(eventType, handleMessage);
        } catch (error) {
          console.warn(
            `SSE: Could not add listener for event type: ${eventType}`,
            error,
          );
        }
      });

      console.log("SSE: EventSource listeners set up for:", eventTypes);

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("SSE: Error creating connection:", error);
      isConnectingRef.current = false;
      handleError(error as Event);
    }
  }, [buildSSEUrl, handleOpen, handleError, handleMessage]);

  // Disconnect from SSE
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
    isConnectedRef.current = false;
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, []);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    // Only connect if not already connected
    if (!isConnectedRef.current && !isConnectingRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []); // Empty dependency array to run only once

  return {
    isConnected,
    lastEvent,
    events,
    connect,
    disconnect,
    clearEvents,
  };
}
