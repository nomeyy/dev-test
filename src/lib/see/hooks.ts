import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
    userId?: string;
    sessionId?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

interface SSEState {
    connected: boolean;
    connecting: boolean;
    error: string | null;
    lastEvent: MessageEvent | null;
    reconnectCount: number;
}

export function useSSE(options: UseSSEOptions = {}) {
    const [state, setState] = useState<SSEState>({
        connected: false,
        connecting: false,
        error: null,
        lastEvent: null,
        reconnectCount: 0
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const eventListenersRef = useRef<Map<string, (event: MessageEvent) => void>>(new Map());

    const {
        userId,
        sessionId,
        reconnectInterval = 3000,
        maxReconnectAttempts = 5
    } = options;

    const connect = () => {
        if (eventSourceRef.current?.readyState === EventSource.OPEN) {
            return;
        }

        setState(prev => ({ ...prev, connecting: true, error: null }));

        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (sessionId) params.set('sessionId', sessionId);

        const url = `/api/sse?${params.toString()}`;
        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
            setState(prev => ({
                ...prev,
                connected: true,
                connecting: false,
                error: null,
                reconnectCount: 0
            }));
        };

        eventSource.onmessage = (event) => {
            setState(prev => ({ ...prev, lastEvent: event }));
        };

        eventSource.onerror = () => {
            setState(prev => {
                const newReconnectCount = prev.reconnectCount + 1;
                return {
                    ...prev,
                    connected: false,
                    connecting: false,
                    error: `Connection failed (attempt ${newReconnectCount})`,
                    reconnectCount: newReconnectCount
                };
            });

            eventSource.close();

            // Attempt reconnection
            if (state.reconnectCount < maxReconnectAttempts) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, reconnectInterval);
            }
        };

        // Add custom event listeners
        eventListenersRef.current.forEach((listener, eventType) => {
            eventSource.addEventListener(eventType, listener);
        });

        eventSourceRef.current = eventSource;
    };

    const disconnect = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        setState(prev => ({ ...prev, connected: false, connecting: false }));
    };

    const addEventListener = (eventType: string, listener: (event: MessageEvent) => void) => {
        eventListenersRef.current.set(eventType, listener);

        if (eventSourceRef.current) {
            eventSourceRef.current.addEventListener(eventType, listener);
        }
    };

    const removeEventListener = (eventType: string) => {
        const listener = eventListenersRef.current.get(eventType);
        if (listener && eventSourceRef.current) {
            eventSourceRef.current.removeEventListener(eventType, listener);
        }
        eventListenersRef.current.delete(eventType);
    };

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        addEventListener,
        removeEventListener
    };
}