'use client';

import { useRef, useState, useCallback } from 'react';
import { type SSEEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface SSEHookOptions {
  url?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

export interface SSEHookState {
  id: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: SSEEvent | null;
  reconnectAttempts: number;
}

export function useSSE(options: SSEHookOptions = {}) {
  const {
    url = '/api/sse',
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [state, setState] = useState<SSEHookState>({
    id: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connect = useCallback(() => {
    if (state.isConnected || state.isConnecting) {
      return;
    }
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const clientId = uuidv4()
      const eventSource = new EventSource(`${url}?clientId=${clientId}`);
      eventSourceRef.current = eventSource;

      eventSourceRef.current.onopen = () => {
        setState(prev => ({
          ...prev,
          id: clientId,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }));
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data: unknown = JSON.parse(event.data as string);
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: event.type,
            data,
          };

          setState(prev => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // Listen for custom event types
      eventSourceRef.current.addEventListener('connected', (event) => {
        try {
          const data: unknown = JSON.parse(event.data as string);
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: 'connected',
            data,
          };

          setState(prev => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          console.error('Error parsing connected event:', error);
        }
      });


      eventSourceRef.current.onerror = (error) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: 'Connection error',
        }));
        onError?.(error);
      };


      eventSourceRef.current.addEventListener('heartbeat', (event) => {
        try {
          const data: unknown = JSON.parse(event.data as string);
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: 'heartbeat',
            data,
          };

          setState(prev => ({ ...prev, lastEvent: sseEvent }));
          onMessage?.(sseEvent);
        } catch (error) {
          console.error('Error parsing heartbeat event:', error);
        }
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to create EventSource',
      }));
    }
  }, [url, state.isConnected, state.isConnecting, onOpen, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
    }));

    reconnectAttemptsRef.current = 0;
    onClose?.();
  }, [onClose]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setState(prev => ({ ...prev, reconnectAttempts: 0 }));
    connect();
  }, [disconnect, connect]);


  return {
    ...state,
    connect,
    disconnect,
    reconnect,
  };
} 