import { useState, useEffect, useCallback, useRef } from "react";

export interface SSEMessage {
  id?: string;
  event: string;
  data: any;
  timestamp: number;
}

export interface SSEConnection {
  connect: () => Promise<string>;
  disconnect: () => void;
  isConnected: boolean;
  lastMessage: SSEMessage | null;
  error: string | null;
}

/**
 * React hook for Server-Sent Events (SSE)
 * Provides a clean interface for SSE connections with automatic reconnection
 */
export function useSSE(): SSEConnection {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setError(null);
  }, []);

  // Handle connection
  const connect = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Clean up any existing connection
        cleanup();

        // Create new EventSource
        const eventSource = new EventSource("/api/sse");
        eventSourceRef.current = eventSource;

        // Connection opened
        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
          console.log("SSE connection established");
        };

        // Handle messages
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const message: SSEMessage = {
              id: event.lastEventId,
              event: event.type || "message",
              data,
              timestamp: Date.now(),
            };
            setLastMessage(message);
          } catch (error) {
            console.error("Failed to parse SSE message:", error);
          }
        };

        // Handle specific events
        eventSource.addEventListener("connected", (event) => {
          try {
            const data = JSON.parse(event.data);
            setClientId(data.clientId);
            resolve(data.clientId);
          } catch (error) {
            console.error("Failed to parse connection event:", error);
            reject(error);
          }
        });

        eventSource.addEventListener("ping", (event) => {
          try {
            const data = JSON.parse(event.data);
            const message: SSEMessage = {
              id: event.lastEventId,
              event: "ping",
              data,
              timestamp: Date.now(),
            };
            setLastMessage(message);
          } catch (error) {
            console.error("Failed to parse ping event:", error);
          }
        });

        eventSource.addEventListener("notification", (event) => {
          try {
            const data = JSON.parse(event.data);
            const message: SSEMessage = {
              id: event.lastEventId,
              event: "notification",
              data,
              timestamp: Date.now(),
            };
            setLastMessage(message);
          } catch (error) {
            console.error("Failed to parse notification event:", error);
          }
        });

        eventSource.addEventListener("broadcast", (event) => {
          try {
            const data = JSON.parse(event.data);
            const message: SSEMessage = {
              id: event.lastEventId,
              event: "broadcast",
              data,
              timestamp: Date.now(),
            };
            setLastMessage(message);
          } catch (error) {
            console.error("Failed to parse broadcast event:", error);
          }
        });

        // Handle errors
        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          setError("Connection error occurred");
          setIsConnected(false);

          // Attempt reconnection if not manually disconnected
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay =
              reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(
                `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
              );
              connect().catch(console.error);
            }, delay);
          } else {
            setError("Max reconnection attempts reached");
          }
        };

        // Handle connection close
        eventSource.onclose = () => {
          console.log("SSE connection closed");
          setIsConnected(false);
        };
      } catch (error) {
        console.error("Failed to create SSE connection:", error);
        setError(error instanceof Error ? error.message : "Connection failed");
        reject(error);
      }
    });
  }, [cleanup]);

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    setClientId("");
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    lastMessage,
    error,
  };
}
