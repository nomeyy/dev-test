"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { SSEEventEnum, type ConnectedEventData } from "@/lib/sse/types";

export const useSSE = (options: {
  onEvent?: <E extends SSEEventEnum>(event: E, data: unknown) => void;
  onConnect?: (data: ConnectedEventData) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectOnError?: boolean;
  reconnectInterval?: number;
  userId?: string;
}): {
  connected: boolean;
  clientId: string | null;
  error: Event | null;
  disconnect: () => void;
} => {
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    reconnectOnError = true,
    reconnectInterval = 5000,
  } = options;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    try {
      const query = new URLSearchParams();
      if (options.userId) {
        query.set("userId", options.userId);
      }
      const eventSource = new EventSource(`/api/sse?${query.toString()}`);
      esRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };

      eventSource.onerror = (event) => {
        setConnected(false);
        setError(event);
        eventSource.close();

        if (onError) {
          onError(event);
        }

        if (reconnectOnError && reconnectInterval > 0) {
          reconnectRef.current = setTimeout(connect, reconnectInterval);
        }
      };
      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(`${event.data}`) as ConnectedEventData;
          setClientId(data.clientId);
          if (onConnect) {
            onConnect(data);
          }
        } catch (error) {
          console.error("Error parsing connected event data:", error);
        }
      });

      eventSource.addEventListener("heartbeat", () => {
        if (onEvent) {
          onEvent(SSEEventEnum.heartbeat, "Heartbeat");
        }
      });

      eventSource.onmessage = (event) => {
        try {
          if (onEvent) {
            onEvent(SSEEventEnum.message, event.data);
          }
        } catch (error) {
          console.error("Error parsing message event data:", error);
        }
      };
    } catch (error) {
      console.error("Error creating EventSource:", error);
      if (reconnectOnError && reconnectInterval > 0) {
        reconnectRef.current = setTimeout(connect, reconnectInterval);
      }
    }
  }, [onConnect, onError, onEvent, reconnectInterval, reconnectOnError]);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }

    setConnected(false);

    if (onDisconnect) {
      onDisconnect();
    }
  }, [onDisconnect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    clientId,
    error,
    disconnect,
  };
};
