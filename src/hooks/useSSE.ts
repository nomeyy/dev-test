import { useEffect, useRef, useState, useCallback } from 'react';

interface SSEOptions {
  topics?: string[];
  onMessage?: (event: string, data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface SSEState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectionInfo: any;
  error: string | null;
  reconnectAttempts: number;
}

export function useSSE(options: SSEOptions = {}) {
  const {
    topics = [],
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [state, setState] = useState<SSEState>({
    status: 'disconnected',
    connectionInfo: null,
    error: null,
    reconnectAttempts: 0
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const topicParam = topics.length > 0 ? `?topic=${topics.join(',')}` : '';
      const eventSource = new EventSource(`/api/sse${topicParam}`, {
        withCredentials: true
      });

      eventSource.addEventListener('open', () => {
        setState(prev => ({ 
          ...prev, 
          status: 'connected', 
          error: null,
          reconnectAttempts: 0 
        }));
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      });

      eventSource.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data);
          onMessage?.('message', data);
        } catch (error) {
          onMessage?.('message', e.data);
        }
      });

      eventSource.addEventListener('welcome', (e) => {
        try {
          const data = JSON.parse(e.data);
          setState(prev => ({ ...prev, connectionInfo: data }));
          onMessage?.('welcome', data);
        } catch (error) {
          console.error('Failed to parse welcome message:', error);
        }
      });

      // Listen for custom events
      const customEvents = [
        'test_message', 'topic_message', 'broadcast_message',
        'new_message', 'system_update', 'live_update',
        'webhook_notification', 'system_alert', 'topic_update',
        'data_update'
      ];

      customEvents.forEach(eventType => {
        eventSource.addEventListener(eventType, (e) => {
          try {
            const data = JSON.parse(e.data);
            onMessage?.(eventType, data);
          } catch (error) {
            onMessage?.(eventType, e.data);
          }
        });
      });

      eventSource.addEventListener('error', (e) => {
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Connection error occurred' 
        }));
        onError?.(e);
      });

      eventSource.addEventListener('close', () => {
        setState(prev => ({ ...prev, status: 'disconnected' }));
        onDisconnect?.();
      });

      eventSourceRef.current = eventSource;

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Failed to create connection' 
      }));
      onError?.(error as Event);
    }
  }, [topics, onMessage, onConnect, onDisconnect, onError]);

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
      status: 'disconnected', 
      error: null,
      reconnectAttempts: 0 
    }));
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    if (!autoReconnect || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Max reconnection attempts reached' 
      }));
      return;
    }

    reconnectAttemptsRef.current++;
    setState(prev => ({ 
      ...prev, 
      reconnectAttempts: reconnectAttemptsRef.current 
    }));

    const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval, connect]);

  // Auto-reconnect on error
  useEffect(() => {
    if (state.status === 'error' && autoReconnect) {
      reconnect();
    }
  }, [state.status, autoReconnect, reconnect]);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status: state.status,
    connectionInfo: state.connectionInfo,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    connect,
    disconnect,
    reconnect
  };
}

// Hook for listening to specific events
export function useSSEEvent(eventType: string, callback: (data: any) => void) {
  const [lastEvent, setLastEvent] = useState<any>(null);

  const handleMessage = useCallback((event: string, data: any) => {
    if (event === eventType) {
      setLastEvent(data);
      callback(data);
    }
  }, [eventType, callback]);

  const sse = useSSE({ onMessage: handleMessage });

  return {
    ...sse,
    lastEvent
  };
}

// Hook for user-specific notifications
export function useUserNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleMessage = useCallback((event: string, data: any) => {
    if (event === 'new_message' || event === 'webhook_notification') {
      setNotifications(prev => [data, ...prev.slice(0, 49)]); // Keep last 50
    }
  }, []);

  const sse = useSSE({ onMessage: handleMessage });

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    ...sse,
    notifications,
    clearNotifications
  };
}

// Hook for topic subscriptions
export function useTopicSubscription(topic: string) {
  const [updates, setUpdates] = useState<any[]>([]);

  const handleMessage = useCallback((event: string, data: any) => {
    if (event === 'topic_update' || event === 'live_update' || event === 'data_update') {
      setUpdates(prev => [data, ...prev.slice(0, 49)]); // Keep last 50
    }
  }, []);

  const sse = useSSE({ 
    topics: [topic],
    onMessage: handleMessage 
  });

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    ...sse,
    updates,
    clearUpdates
  };
}
