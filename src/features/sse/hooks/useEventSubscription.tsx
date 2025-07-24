"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import type {
  ClientSSEMessage,
  ClientSSEConnectionOptions,
} from "@/features/sse";

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  latestMessage: ClientSSEMessage | null;
}

/**
 * Hook to handle SSE connections and tRPC subscriptions.
 *
 * @param options Initial options for a new SSE connection
 * @returns Current connection state and useful callbacks
 *
 * @example
 * ```typescript
 * const { isConnected, latestMessage, connect, disconnect } = useEventSubscription({
 *   userId: 'user:id-1',
 *   onMessage: (message) => console.log('Received:', message),
 *   onConnect: () => console.log('Connected!'),
 * });
 *
 */
export function useEventSubscription(options: ClientSSEConnectionOptions = {}) {
  const { userId, sessionId, onMessage, onConnect, onDisconnect, onError } =
    options;

  const [state, setState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    latestMessage: null,
  });

  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscription = api.sse.subscribe.useSubscription(
    { userId, sessionId },
    {
      enabled: isSubscribed,
      onData: (data) => {
        const message: ClientSSEMessage = {
          id: data.id,
          event: data.event,
          data: data.data,
          timestamp: data.timestamp,
        };

        switch (message.event) {
          case "connected":
            onConnect?.();
            break;
          default:
            break;
        }

        setState((prev) => ({
          ...prev,
          latestMessage: message,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));

        onMessage?.(message);
      },
      onComplete: () => {
        onDisconnect?.();
      },
      onError: (error) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message || "Subscription error occurred",
        }));
        onError?.(error);
      },
    },
  );

  const connect = useCallback(() => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    setIsSubscribed(true);
  }, []);

  const disconnect = useCallback(() => {
    setIsSubscribed(false);
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, []);

  useEffect(() => {
    if (!options.onConnect && !options.onDisconnect) {
      connect();
      return () => disconnect();
    }
  }, [connect, disconnect, options.onConnect, options.onDisconnect]);

  return {
    ...state,
    connect,
    disconnect,
    subscription,
  };
}
