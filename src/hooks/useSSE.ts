import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface SSEConfig {
  userId?: string;
  sessionId?: string;
  enableLogging?: boolean;
}

export function useSSE(config: SSEConfig = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const { userId, sessionId, enableLogging = true } = config;

  const log = useCallback((message: string) => {
    if (enableLogging) {
      console.log(`[SSE Hook] ${message}`);
    }
  }, [enableLogging]);

  const buildURL = useCallback(() => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (sessionId) params.append('sessionId', sessionId);
    return `/api/sse?${params.toString()}`;
  }, [userId, sessionId]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = buildURL();
    log(`Connecting to SSE endpoint: ${url}`);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      log('SSE connection opened');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      log('SSE connection error');
      setIsConnected(false);
      setError('Connection error');
    };

    // Handle all event types
    const handleEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          type: (event as any).type || 'message',
          data,
          timestamp: new Date().toISOString(),
        };
        setLastMessage(message);
        log(`Received event: ${message.type}`);
      } catch (error) {
        log(`Error parsing event: ${error}`);
      }
    };

    // Listen for all event types
    eventSource.addEventListener('connection', handleEvent);
    eventSource.addEventListener('notification', handleEvent);
    eventSource.addEventListener('ping', handleEvent);
    eventSource.onmessage = handleEvent;

    return eventSource;
  }, [buildURL, log]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setError(null);
    log('SSE connection closed');
  }, [log]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
  };
}