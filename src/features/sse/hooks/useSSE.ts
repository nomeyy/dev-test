"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SSEEvent } from '../types';

export interface UseSSEOptions {
  url?: string;
  withCredentials?: boolean;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoReconnect?: boolean;
  /**
   * When true, the hook will automatically connect on mount.
   * Default: true.
   */
  connectOnMount?: boolean;
}

export interface UseSSEReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Event | null;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  clearEvents: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = '/api/sse',
    withCredentials = true,
    onOpen,
    onError,
    onMessage,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    autoReconnect = false,
    connectOnMount = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  const parseSSEEvent = useCallback((event: MessageEvent): SSEEvent | null => {
    try {
      const eventType = event.type || 'message';
      
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          return {
            event: eventType,
            data,
            timestamp: new Date(),
          } as SSEEvent;
        } catch {
          return {
            event: eventType,
            data: event.data,
            timestamp: new Date(),
          } as SSEEvent;
        }
      }

      return null;
    } catch (parseError) {
      console.error('Error parsing SSE event:', parseError);
      return null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    if (!isMountedRef.current) return;
    
    console.log('SSE connection opened');
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
    onOpen?.();
  }, [onOpen]);

  const handleError = useCallback((event: Event) => {
    if (!isMountedRef.current) return;
    
    console.log('SSE connection error:', event);
    setIsConnected(false);
    setIsConnecting(false);
    setError(event);
    onError?.(event);

    // Only auto-reconnect if enabled and we haven't exceeded max attempts
    if (autoReconnect && 
        reconnectAttemptsRef.current < maxReconnectAttempts &&
        isMountedRef.current) {
      
      reconnectAttemptsRef.current++;
      console.log(`SSE attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && 
            (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED)) {
          connectRef.current?.();
        }
      }, reconnectInterval);
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval, onError]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!isMountedRef.current) return;
    
    const parsedEvent = parseSSEEvent(event);
    if (parsedEvent) {
      try {
        console.log('SSE received event', {
          event: parsedEvent.event,
          ts: parsedEvent.timestamp.toISOString(),
        });
      } catch {}
      // optional console logs were added previously; reverting to simpler behavior
      setLastEvent(parsedEvent);
      setEvents(prev => [...prev, parsedEvent]);
      onMessage?.(parsedEvent);
    }
  }, [parseSSEEvent, onMessage]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Prevent multiple connections
    if (eventSourceRef.current?.readyState === EventSource.OPEN || isConnecting) {
      console.log('SSE connection already exists or is connecting');
      return;
    }

    try {
      console.log('SSE attempting to connect to:', url);
      setIsConnecting(true);
      setError(null);

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Create new EventSource
      const eventSource = new EventSource(url, {
        withCredentials,
      });

      eventSource.onopen = handleOpen;
      eventSource.onerror = handleError;
      eventSource.onmessage = handleMessage;
      
      // Add custom event listeners for specific event types
      eventSource.addEventListener('connected', (event) => {
        const customEvent = {
          type: 'connected',
          data: event.data
        } as MessageEvent;
        handleMessage(customEvent);
      });

      eventSource.addEventListener('heartbeat', (event) => {
        const customEvent = { type: 'heartbeat', data: event.data } as MessageEvent;
        handleMessage(customEvent);
      });

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('SSE connection failed:', err);
      if (isMountedRef.current) {
        setIsConnecting(false);
        setError(err as Event);
      }
    }
  }, [url, withCredentials, isConnecting, handleOpen, handleError, handleMessage]);

  // Store the connect function in a ref for use in timeouts
  connectRef.current = connect;

  const disconnect = useCallback(() => {
    console.log('SSE disconnecting');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      reconnectAttemptsRef.current = 0;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 1000);
  }, [disconnect, connect]);

  const clearEvents = useCallback(() => {
    if (isMountedRef.current) {
      setEvents([]);
    }
  }, []);

  // Auto-connect on mount (only once if enabled)
  useEffect(() => {
    isMountedRef.current = true;
    
    if (connectOnMount) {
      // Only connect if not already connected
      if (!eventSourceRef.current) {
        connect();
      }
    }
    
    return () => {
      isMountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once!

  return {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    events,
    connect,
    disconnect,
    reconnect,
    clearEvents,
  };
}