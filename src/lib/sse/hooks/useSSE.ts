"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SSEEvent, SSEHookState } from "../types";
import { SSEStatus, SSEEventType } from "../types";

/**
 * Configuration options for useSSE hook
 */
interface UseSSEOptions {
  /**
   * Maximum number of events to keep in history
   */
  maxHistorySize?: number;

  /**
   * Whether to automatically reconnect on connection loss
   */
  autoReconnect?: boolean;

  /**
   * Delay before attempting to reconnect (milliseconds)
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts
   */
  maxReconnectAttempts?: number;

  /**
   * Whether to log SSE events to console (for debugging)
   */
  debug?: boolean;
}

/**
 * React hook for consuming Server-Sent Events
 * Provides automatic connection management, reconnection, and event history
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    maxHistorySize = 50,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    debug = false,
  } = options;

  const [state, setState] = useState<SSEHookState>({
    status: SSEStatus.DISCONNECTED,
    lastEvent: null,
    eventHistory: [],
    error: null,
    connectionId: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  /**
   * Log debug messages if debug mode is enabled
   */
  const debugLog = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[useSSE] ${message}`, data);
      }
    },
    [debug],
  );

  /**
   * Update state with a new event
   */
  const handleNewEvent = useCallback(
    (event: SSEEvent) => {
      setState((prevState) => {
        const newHistory = [event, ...prevState.eventHistory].slice(
          0,
          maxHistorySize,
        );

        return {
          ...prevState,
          lastEvent: event,
          eventHistory: newHistory,
        };
      });

      debugLog("Received event", event);
    },
    [maxHistorySize, debugLog],
  );

  /**
   * Handle EventSource events
   */
  const setupEventListeners = useCallback(
    (eventSource: EventSource) => {
      eventSource.onopen = () => {
        debugLog("SSE connection opened");
        setState((prevState) => ({
          ...prevState,
          status: SSEStatus.CONNECTED,
          error: null,
        }));
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onerror = (error) => {
        debugLog("SSE connection error", error);

        setState((prevState) => ({
          ...prevState,
          status: SSEStatus.ERROR,
          error: new Error("SSE connection error"),
        }));

        // Only attempt reconnect if not manually disconnected
        if (autoReconnect && !isManualDisconnectRef.current) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            setState((prevState) => ({
              ...prevState,
              status: SSEStatus.RECONNECTING,
            }));

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              debugLog(`Reconnection attempt ${reconnectAttemptsRef.current}`);
              connect();
            }, reconnectDelay);
          } else {
            debugLog("Max reconnection attempts reached");
            setState((prevState) => ({
              ...prevState,
              status: SSEStatus.DISCONNECTED,
              error: new Error("Max reconnection attempts reached"),
            }));
          }
        }
      };

      // Set up listeners for different event types
      const eventTypes = [
        SSEEventType.CONNECTED,
        SSEEventType.HEARTBEAT,
        SSEEventType.NOTIFICATION,
        SSEEventType.USER_UPDATE,
        SSEEventType.BROADCAST,
        SSEEventType.TEST_MESSAGE,
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = {
              id: event.lastEventId || `${Date.now()}`,
              type: eventType,
              data,
              timestamp: data.timestamp || Date.now(),
              userId: data.userId,
              sessionId: data.sessionId,
            };

            // Extract connection ID from connected event
            if (eventType === SSEEventType.CONNECTED && data.connectionId) {
              debugLog("Setting connection ID from connected event", {
                connectionId: data.connectionId,
              });
              setState((prevState) => ({
                ...prevState,
                connectionId: data.connectionId,
              }));
            }

            debugLog("Received SSE event", {
              type: eventType,
              data,
              eventId: sseEvent.id,
            });

            handleNewEvent(sseEvent);
          } catch (error) {
            debugLog("Error parsing SSE event data", {
              error,
              data: event.data,
            });
          }
        });
      });

      // Handle generic 'message' events (fallback)
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || `${Date.now()}`,
            type: "message",
            data,
            timestamp: data.timestamp || Date.now(),
            userId: data.userId,
            sessionId: data.sessionId,
          };

          handleNewEvent(sseEvent);
        } catch (error) {
          debugLog("Error parsing generic SSE message", {
            error,
            data: event.data,
          });
        }
      };
    },
    [
      autoReconnect,
      maxReconnectAttempts,
      reconnectDelay,
      debugLog,
      handleNewEvent,
    ],
  );

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      debugLog("SSE already connected");
      return;
    }

    debugLog("Connecting to SSE...");
    isManualDisconnectRef.current = false;

    setState((prevState) => ({
      ...prevState,
      status: SSEStatus.CONNECTING,
      error: null,
    }));

    try {
      const eventSource = new EventSource("/api/sse");
      eventSourceRef.current = eventSource;
      setupEventListeners(eventSource);
    } catch (error) {
      debugLog("Failed to create EventSource", error);
      setState((prevState) => ({
        ...prevState,
        status: SSEStatus.ERROR,
        error:
          error instanceof Error
            ? error
            : new Error("Failed to connect to SSE"),
      }));
    }
  }, [setupEventListeners, debugLog]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    debugLog("Disconnecting from SSE...");
    isManualDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prevState) => ({
      ...prevState,
      status: SSEStatus.DISCONNECTED,
      connectionId: null,
    }));
  }, [debugLog]);

  /**
   * Clear event history
   */
  const clearHistory = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      eventHistory: [],
      lastEvent: null,
    }));
  }, []);

  /**
   * Get events of a specific type from history
   */
  const getEventsByType = useCallback(
    (eventType: string) => {
      return state.eventHistory.filter((event) => event.type === eventType);
    },
    [state.eventHistory],
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    clearHistory,
    getEventsByType,
    isConnected: state.status === SSEStatus.CONNECTED,
    isConnecting: state.status === SSEStatus.CONNECTING,
    isReconnecting: state.status === SSEStatus.RECONNECTING,
    isDisconnected: state.status === SSEStatus.DISCONNECTED,
    hasError: state.status === SSEStatus.ERROR,
  };
}
