import { useEffect, useRef, useState, useCallback } from "react";

export interface SSEEvent {
  event: string;
  data: any;
  id?: string;
}

export interface SSEConnection {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

export interface UseSSEOptions {
  userId?: string;
  sessionId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

export function useSSE(options: UseSSEOptions = {}): SSEConnection {
  const {
    userId,
    sessionId,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (
      isConnectingRef.current ||
      eventSourceRef.current?.readyState === EventSource.CONNECTING
    ) {
      console.log("SSE connection already in progress, skipping...");
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    isConnectingRef.current = true;

    try {
      // Build SSE URL with parameters
      const url = new URL("/api/sse", window.location.origin);
      if (userId) url.searchParams.set("userId", userId);
      if (sessionId) url.searchParams.set("sessionId", sessionId);

      console.log("Connecting to SSE:", url.toString());

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        onConnect?.();
        console.log("SSE connected");
      };

      // Handle all messages (including broadcast messages)
      eventSource.onmessage = (event) => {
        console.log("SSE onmessage received:", {
          type: event.type,
          data: event.data,
          lastEventId: event.lastEventId,
        });

        try {
          const sseEvent: SSEEvent = {
            event: event.type || "message",
            data: JSON.parse(event.data),
            id: event.lastEventId,
          };

          console.log("SSE event processed:", sseEvent);
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse SSE message:", {
            error: parseError,
            data: event.data,
            type: event.type,
            lastEventId: event.lastEventId,
          });

          // Still try to handle the message even if parsing fails
          const sseEvent: SSEEvent = {
            event: event.type || "message",
            data: {
              raw: event.data,
              parseError:
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError),
            },
            id: event.lastEventId,
          };

          setLastEvent(sseEvent);
          setEvents((prev) => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        isConnectingRef.current = false;

        // Get more detailed error information
        const target = event.target as EventSource;
        let errorMessage = "SSE connection error";

        if (target.readyState === EventSource.CLOSED) {
          errorMessage = "SSE connection closed";
        } else if (target.readyState === EventSource.CONNECTING) {
          errorMessage = "SSE connection failed, attempting to reconnect";
        }

        setError(errorMessage);
        onError?.(event);
        console.error("SSE error:", {
          readyState: target.readyState,
          url: target.url,
          error: event,
        });

        // Don't auto-reconnect if it's a rate limit error or connection is closed
        if (target.readyState === EventSource.CLOSED) {
          console.log("SSE connection closed, not attempting auto-reconnect");
          return;
        }

        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `SSE reconnecting... (attempt ${reconnectAttemptsRef.current})`,
            );
            connect();
          }, reconnectInterval);
        }
      };

      // Handle specific event types with addEventListener
      eventSource.addEventListener("connected", (event) => {
        console.log("SSE connected event received:", event);
        try {
          const sseEvent: SSEEvent = {
            event: "connected",
            data: JSON.parse(event.data),
            id: event.lastEventId,
          };
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse connected event:", parseError);
        }
      });

      eventSource.addEventListener("heartbeat", (event) => {
        console.log("SSE heartbeat event received:", event);
        try {
          const sseEvent: SSEEvent = {
            event: "heartbeat",
            data: JSON.parse(event.data),
            id: event.lastEventId,
          };
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev, sseEvent]);
          onMessage?.(sseEvent);

          // Update heartbeat timestamp to prevent timeout
          if (sseEvent.data?.timestamp) {
            console.log("Heartbeat received:", sseEvent.data.timestamp);
          }
        } catch (parseError) {
          console.error("Failed to parse heartbeat event:", parseError);
        }
      });

      // Handle broadcast messages specifically
      eventSource.addEventListener("broadcast_message", (event) => {
        console.log("SSE broadcast_message event received:", event);
        try {
          const sseEvent: SSEEvent = {
            event: "broadcast_message",
            data: JSON.parse(event.data),
            id: event.lastEventId,
          };
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error("Failed to parse broadcast_message event:", parseError);
        }
      });
    } catch (err) {
      isConnectingRef.current = false;
      setError("Failed to create SSE connection");
      console.error("SSE connection error:", err);
    }
  }, [
    userId,
    sessionId,
    autoReconnect,
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

    setIsConnected(false);
    isConnectingRef.current = false;
    onDisconnect?.();
    console.log("SSE disconnected");
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Only connect on mount, not when dependencies change
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Empty dependency array

  return {
    isConnected,
    lastEvent,
    events,
    error,
    reconnect,
    disconnect,
  };
}
