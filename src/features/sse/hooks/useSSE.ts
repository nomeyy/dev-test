/**
 * React hooks for SSE integration
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSSEClient } from "../services/sse-client";
import type { SSEClient, SSEClientOptions } from "../services/sse-client";

export interface UseSSEOptions extends Omit<SSEClientOptions, "url"> {
  /** SSE endpoint URL */
  url: string;
  /** Whether to connect automatically on mount */
  autoConnect?: boolean;
  /** Dependencies that trigger reconnection when changed */
  dependencies?: unknown[];
}

export interface UseSSEReturn {
  /** Whether the SSE connection is open */
  isConnected: boolean;
  /** Whether currently trying to connect */
  isConnecting: boolean;
  /** Connection error if any */
  error: Error | null;
  /** Manual connect function */
  connect: () => Promise<void>;
  /** Manual disconnect function */
  disconnect: () => void;
  /** Add event listener */
  addEventListener: (event: string, handler: (data: unknown) => void) => void;
  /** Remove event listener */
  removeEventListener: (
    event: string,
    handler: (data: unknown) => void,
  ) => void;
  /** Remove all listeners for an event */
  removeAllListeners: (event?: string) => void;
  /** SSE client instance for advanced usage */
  client: SSEClient | null;
}

/**
 * Hook for managing SSE connections
 */
export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<SSEClient | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when they change
  optionsRef.current = options;

  const connect = useCallback(async () => {
    if (clientRef.current?.isConnected()) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create new client if needed
      clientRef.current ??= createSSEClient({
        ...optionsRef.current,
        debug: optionsRef.current.debug ?? false,
      });

      await clientRef.current.connect();
      setIsConnected(true);
    } catch (err) {
      const connectionError =
        err instanceof Error ? err : new Error(String(err));
      setError(connectionError);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  const addEventListener = useCallback(
    (event: string, handler: (data: unknown) => void) => {
      if (clientRef.current) {
        clientRef.current.addEventListener(event, handler);
      }
    },
    [],
  );

  const removeEventListener = useCallback(
    (event: string, handler: (data: unknown) => void) => {
      if (clientRef.current) {
        clientRef.current.removeEventListener(event, handler);
      }
    },
    [],
  );

  const removeAllListeners = useCallback((event?: string) => {
    if (clientRef.current) {
      clientRef.current.removeAllListeners(event);
    }
  }, []);

  // Auto connect/reconnect logic
  useEffect(() => {
    if (options.autoConnect !== false) {
      void connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    connect,
    disconnect,
    options.autoConnect,
    ...(options.dependencies ?? []),
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, []);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      if (clientRef.current) {
        const connected = clientRef.current.isConnected();
        setIsConnected(connected);
      }
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
    removeAllListeners,
    client: clientRef.current,
  };
}

/**
 * Hook for listening to specific SSE events
 */
export function useSSEEvent<T = unknown>(
  url: string,
  eventType: string,
  handler: (data: T) => void,
  options: Omit<UseSSEOptions, "url"> = {},
): UseSSEReturn {
  const sse = useSSE({ ...options, url });

  useEffect(() => {
    if (handler) {
      const wrappedHandler = (data: unknown) => handler(data as T);
      sse.addEventListener(eventType, wrappedHandler);

      return () => {
        sse.removeEventListener(eventType, wrappedHandler);
      };
    }
  }, [sse, eventType, handler]);

  return sse;
}

/**
 * Hook for SSE events with state management
 */
export function useSSEState<T = unknown>(
  url: string,
  eventType: string,
  initialValue: T,
  options: Omit<UseSSEOptions, "url"> = {},
): [T, UseSSEReturn] {
  const [value, setValue] = useState<T>(initialValue);

  const sse = useSSEEvent(
    url,
    eventType,
    (data: T) => {
      setValue(data);
    },
    options,
  );

  return [value, sse];
}
