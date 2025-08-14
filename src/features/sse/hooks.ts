"use client";

import type { SSEEvent } from "./types";
import { createServiceContext } from "@/utils/service-utils";
import { useCallback, useEffect, useRef, useState } from "react";
const { handleError } = createServiceContext("SSEHooks");

interface UseSSEOptions {
  userId?: string;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  broadcastOptions?: {
    userIds?: string[];
    excludeConnectionIds?: string[];
    eventNames?: string[];
  };
  sendOptions?: {
    userIds?: string[];
    connectionIds?: string[];
  };
}

interface UseSSEReturn {
  isConnected: boolean;
  connectionId?: string;
  broadcastMessage: (
    event: Omit<SSEEvent, "id" | "timestamp">,
  ) => Promise<void>;
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
    broadcastOptions,
    sendOptions,
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
        handleError("Failed to parse Page message:", error);
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

  const broadcastMessage = useCallback(
    async (event: Omit<SSEEvent, "id" | "timestamp">) => {
      try {
        const body = {
          event,
          options: broadcastOptions ?? {},
        };

        await fetch("/api/sse/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        handleError("Failed to broadcast Page message:", error);
      }
    },
    [broadcastOptions],
  );

  const sendMessage = useCallback(
    async (event: Omit<SSEEvent, "id" | "timestamp">) => {
      try {
        const body = {
          event,
          options: sendOptions ?? {},
        };

        await fetch("/api/sse/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        handleError("Failed to send Page message:", error);
      }
    },
    [sendOptions],
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
    broadcastMessage,
    sendMessage,
    reconnect,
    disconnect,
  };
}
