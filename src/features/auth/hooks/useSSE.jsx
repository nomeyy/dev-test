"use client"
import { useState, useEffect, useRef, useCallback } from 'react';

const useSSE = (userId = null, sessionId = null) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [clientId, setClientId] = useState(null);
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const addMessage = useCallback((message) => {
        setMessages(prev => {
            const newMessages = [message, ...prev];
            return newMessages.slice(0, 50);
        });
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            return;
        }

        try {
            setConnectionStatus('connecting');
            setError(null);

            let url = `${API_URL}/sse/connect`;
            const params = new URLSearchParams();

            if (userId) params.append('userId', userId);
            if (sessionId) params.append('sessionId', sessionId);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            console.log('Connecting to SSE:', url);

            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            // Connection opened
            eventSource.onopen = (event) => {
                console.log('SSE connection opened:', event);
                setConnectionStatus('connected');
                reconnectAttempts.current = 0;
                setError(null);
            };

            // Handle specific event types
            eventSource.addEventListener('connected', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE connected event:', data);

                    setClientId(data.data.clientId);
                    addMessage({
                        id: data.id,
                        timestamp: data.timestamp,
                        type: 'system',
                        eventType: 'connected',
                        message: 'Connected to server',
                        data: data.data
                    });
                } catch (error) {
                    console.error('Error parsing connected event:', error);
                }
            });

            // Handle ping/heartbeat events
            eventSource.addEventListener('ping', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE ping received:', data);

                    addMessage({
                        id: data.id,
                        timestamp: data.timestamp,
                        type: 'heartbeat',
                        eventType: 'ping',
                        message: 'Server heartbeat',
                        data: data.data
                    });
                } catch (error) {
                    console.error('Error parsing ping event:', error);
                }
            });

            // Handle test notifications
            eventSource.addEventListener('test-notification', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE test notification:', data);

                    addMessage({
                        id: data.id,
                        timestamp: data.timestamp,
                        type: 'notification',
                        eventType: 'test-notification',
                        message: data.data.message,
                        data: data.data
                    });
                } catch (error) {
                    console.error('Error parsing test notification:', error);
                }
            });

            // Handle broadcast events
            eventSource.addEventListener('broadcast', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE broadcast received:', data);

                    addMessage({
                        id: data.id,
                        timestamp: data.timestamp,
                        type: 'broadcast',
                        eventType: 'broadcast',
                        message: data.data.message || 'Broadcast message',
                        data: data.data
                    });
                } catch (error) {
                    console.error('Error parsing broadcast event:', error);
                }
            });

            eventSource.addEventListener('notification', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE notification received:', data);

                    addMessage({
                        id: data.id,
                        timestamp: data.timestamp,
                        type: 'notification',
                        eventType: 'notification',
                        message: data.data.message || 'New notification',
                        data: data.data
                    });
                } catch (error) {
                    console.error('Error parsing notification event:', error);
                }
            });

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE generic message:', data);

                    addMessage({
                        id: data.id || Date.now(),
                        timestamp: data.timestamp || new Date().toISOString(),
                        type: 'generic',
                        eventType: event.type || 'message',
                        message: data.message || 'Generic message',
                        data: data
                    });
                } catch (error) {
                    console.error('Error parsing generic message:', error);
                    addMessage({
                        id: Date.now(),
                        timestamp: new Date().toISOString(),
                        type: 'raw',
                        eventType: 'raw',
                        message: event.data,
                        data: { raw: event.data }
                    });
                }
            };

            // Connection error
            eventSource.onerror = (event) => {
                console.error('SSE connection error:', event);
                setConnectionStatus('error');

                if (reconnectAttempts.current < maxReconnectAttempts) {
                    setError(`Connection lost. Reconnecting... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        disconnect();
                        connect();
                    }, reconnectDelay);
                } else {
                    setError('Connection failed after maximum retry attempts');
                    disconnect();
                }
            };

        } catch (error) {
            console.error('Error creating SSE connection:', error);
            setConnectionStatus('error');
            setError(`Failed to connect: ${error.message}`);
        }
    }, [API_URL, userId, sessionId, addMessage]);

    // Disconnect from SSE
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setConnectionStatus('disconnected');
        setClientId(null);
        console.log('SSE connection disconnected');
    }, []);

    // Auto-connect on mount
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
        connectionStatus,
        messages,
        error,
        clientId,
        connect,
        disconnect,
        clearMessages,
        isConnected: connectionStatus === 'connected',
        isConnecting: connectionStatus === 'connecting',
        isError: connectionStatus === 'error'
    };
};

export default useSSE;