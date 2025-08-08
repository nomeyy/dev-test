'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { SSEClient, type SSEClientEvents } from '../client/sse-client';
import type { SSEConnectionState, SSEClientOptions } from '../types/index';

export interface UseSSEOptions extends SSEClientOptions {
  autoConnect?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface UseSSEReturn {
  state: SSEConnectionState;
  isConnected: boolean;
  lastMessage: { event: string; data: any; timestamp: Date } | null;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (event: string, handler: (data: any) => void) => void;
  removeEventListener: (event: string) => void;
}

export function useSSE(
  endpoint: string,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const {
    autoConnect = true,
    userId,
    sessionId,
    ...clientOptions
  } = options;
  const [state, setState] = useState<SSEConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<{ event: string; data: any; timestamp: Date } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<SSEClient | null>(null);

  // Build endpoint with query parameters
  const buildEndpoint = useCallback(() => {
    const url = new URL(endpoint, window.location.origin);
    if (userId) url.searchParams.set('userId', userId);
    if (sessionId) url.searchParams.set('sessionId', sessionId);
    return url.toString();
  }, [endpoint, userId, sessionId]);

  const addEventListener = useCallback((event: string, handler: (data: any) => void) => {
    if (clientRef.current) {
      clientRef.current.addEventListener(event, handler);
    }
  }, []);

  const connect = useCallback(() => {
    if (!clientRef.current) {
      const events: SSEClientEvents = {
        onStateChange: (newState) => {
          setState(newState);
          if (newState === 'connected') {
            setError(null);
          }
        },
        onConnect: (event) => {
          console.log('Is it even here:', event);
        },
        onDisconnect: () => {
          console.log('SSE Disconnected');
        },
        onError: (err) => {
          setError(err);
          console.error('SSE Error:', err);
        },
        onMessage: (event, data) => {
          setLastMessage({
            event,
            data,
            timestamp: new Date(),
          });
        },
        onReconnecting: (attempt) => {
          console.log(`SSE Reconnecting (attempt ${attempt})`);
        },
      };

      clientRef.current = new SSEClient(buildEndpoint(), clientOptions, events);
    }

    clientRef.current.connect();
  }, [buildEndpoint, clientOptions]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current = null;
      setState('disconnected');
    }
  }, []);


  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && clientRef.current && state === 'disconnected') {
      clientRef.current.connect();
    }
  }, [autoConnect, state]);


  const removeEventListener = useCallback((event: string) => {
    if (clientRef.current) {
      clientRef.current.removeEventListener(event);
    }
  }, []);

  return {
    state,
    isConnected: state === 'connected',
    lastMessage,
    error,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
  };
}
