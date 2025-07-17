"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import type {
  ClientSSEMessage,
  ClientSSEConnectionOptions,
} from "../models/SSEModel";

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: ClientSSEMessage | null;
  messageCount: number;
}

/**
 * React hook for managing Server-Sent Events connections via tRPC subscriptions.
 *
 * @param options Configuration options for the SSE connection
 * @returns Connection state and control functions
 *
 * @example
 * ```typescript
 * const { isConnected, lastMessage, connect, disconnect } = useSSESubscription({
 *   userId: 'user123',
 *   onMessage: (message) => console.log('Received:', message),
 *   onConnect: () => console.log('Connected!'),
 * });
 *
 * useEffect(() => {
 *   connect();
 *   return () => disconnect();
 * }, []);
 * ```
 */
export function useSSESubscription(options: ClientSSEConnectionOptions = {}) {
  const { userId, sessionId, onMessage, onConnect, onDisconnect, onError } =
    options;

  const [state, setState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    messageCount: 0,
  });

  const [isSubscribed, setIsSubscribed] = useState(false);

  // tRPC subscription
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
          lastMessage: message,
          messageCount: prev.messageCount + 1,
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

  // Auto-connect on mount if no manual control
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
