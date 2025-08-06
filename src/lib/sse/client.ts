import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEventType, ReportEvent } from "./types";

// Global connection state to prevent multiple simultaneous connections
const globalConnectionState = {
  isConnecting: false,
  isConnected: false,
};

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export interface SSEEventData {
  event: SSEEventType;
  data: unknown;
  timestamp: string;
}

export interface UseSSEReturn {
  connectionState: SSEConnectionState;
  events: SSEEventData[];
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
  lastEvent: SSEEventData | null;
}

export function useSSE(): UseSSEReturn {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const [events, setEvents] = useState<SSEEventData[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEventData | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const addEvent = useCallback((event: SSEEventData) => {
    setEvents((prev) => [...prev, event]);
    setLastEvent(event);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  const connect = useCallback(() => {
    if (connectionState.isConnected || connectionState.isConnecting) {
      return;
    }

    // Prevent multiple simultaneous connections globally
    if (
      globalConnectionState.isConnecting ||
      globalConnectionState.isConnected
    ) {
      return;
    }
    globalConnectionState.isConnecting = true;

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const eventSource = new EventSource("/api/sse");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        globalConnectionState.isConnected = true;
        globalConnectionState.isConnecting = false;
        setConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        });
        console.log("SSE: Connected to server");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as unknown;
          const sseEvent: SSEEventData = {
            event: event.type as SSEEventType,
            data,
            timestamp: new Date().toISOString(),
          };
          addEvent(sseEvent);
        } catch (error) {
          console.error("SSE: Error parsing message:", error);
        }
      };

      eventSource.addEventListener("open", () => {
        console.log("SSE: Connection established");
      });

      eventSource.addEventListener("ping", () => {
        // Handle ping events (keep connection alive)
        console.log("SSE: Received ping");
      });

      eventSource.addEventListener("report.generating", (event) => {
        try {
          const data = JSON.parse(event.data as string) as ReportEvent;
          const sseEvent: SSEEventData = {
            event: "report.generating",
            data,
            timestamp: new Date().toISOString(),
          };
          addEvent(sseEvent);
        } catch (error) {
          console.error("SSE: Error parsing report.generating event:", error);
        }
      });

      eventSource.addEventListener("report.completed", (event) => {
        try {
          const data = JSON.parse(event.data as string) as ReportEvent;
          const sseEvent: SSEEventData = {
            event: "report.completed",
            data,
            timestamp: new Date().toISOString(),
          };
          addEvent(sseEvent);
        } catch (error) {
          console.error("SSE: Error parsing report.completed event:", error);
        }
      });

      eventSource.addEventListener("report.failed", (event) => {
        try {
          const data = JSON.parse(event.data as string) as ReportEvent;
          const sseEvent: SSEEventData = {
            event: "report.failed",
            data,
            timestamp: new Date().toISOString(),
          };
          addEvent(sseEvent);
        } catch (error) {
          console.error("SSE: Error parsing report.failed event:", error);
        }
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data as string) as unknown;
          const sseEvent: SSEEventData = {
            event: "notification",
            data,
            timestamp: new Date().toISOString(),
          };
          addEvent(sseEvent);
        } catch (error) {
          console.error("SSE: Error parsing notification event:", error);
        }
      });

      eventSource.onerror = (error) => {
        console.error("SSE: Connection error:", error);
        globalConnectionState.isConnected = false;
        globalConnectionState.isConnecting = false;
        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: "Connection failed",
        }));

        // Attempt to reconnect
        if (connectionState.reconnectAttempts < maxReconnectAttempts) {
          const delay =
            reconnectDelay * Math.pow(2, connectionState.reconnectAttempts);
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionState((prev) => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("SSE: Error creating connection:", error);
      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "Failed to create connection",
      }));
    }
  }, [
    connectionState.isConnected,
    connectionState.isConnecting,
    connectionState.reconnectAttempts,
    addEvent,
  ]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    globalConnectionState.isConnected = false;
    globalConnectionState.isConnecting = false;
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    });

    console.log("SSE: Disconnected from server");
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    connectionState,
    events,
    connect,
    disconnect,
    clearEvents,
    lastEvent,
  };
}
