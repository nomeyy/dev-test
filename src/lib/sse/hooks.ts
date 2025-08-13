import type { SSEEvent } from "@/lib/sse/types";
import { useEffect, useRef, useState, useCallback } from "react";

interface UseSSEOptions {
  userId?: string;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface UseSSEReturn {
  isConnected: boolean;
  connectionId?: string;
  sendMessage: (event: Omit<SSEEvent, "id" | "timestamp">) => Promise<void>;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * React hook for consuming Server-Sent Events.
 *
 * @example
 * ```typescript
 * const { isConnected, connectionId } = useSSE({
 *   userId: 'user123',
 *   onMessage: (event) => {
 *     console.log('Received event:', event);
 *   },
 * });
 * ```
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string>();
  const eventSourceRef = useRef<EventSource>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null);

  const {
    userId,
    onMessage,
    onError,
    onOpen,
    onClose,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
  }, [onMessage, onError, onOpen]);

  const connect = useCallback(() => {
    console.log(
      userId,
      onMessage,
      onError,
      onOpen,
      autoReconnect,
      reconnectInterval,
    );
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);

    const url = `/api/sse/connect?${params.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      onOpenRef.current?.();
    };

    eventSource.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;

        if (data.type === "connected") {
          const val =
            typeof data.data === "string"
              ? (JSON.parse(data.data) as { connectionId: string })
              : data.data;

          setConnectionId(val.connectionId as string);
        } else if (data.type !== "heartbeat") {
          onMessageRef.current?.(data);
        }
      } catch (error) {
        console.error("Failed to parse Page message:", error);
      }
    };

    eventSource.onerror = (error) => {
      setIsConnected(false);
      onErrorRef.current?.(error);

      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    eventSourceRef.current = eventSource;
  }, [userId, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionId(undefined);
    onClose?.();
  }, [onClose]);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  const sendMessage = useCallback(
    async (event: Omit<SSEEvent, "id" | "timestamp">) => {
      try {
        await fetch("/api/sse/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        });
      } catch (error) {
        console.error("Failed to send Page message:", error);
      }
    },
    [],
  );

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionId,
    sendMessage,
    reconnect,
    disconnect,
  };
}
