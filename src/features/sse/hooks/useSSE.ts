"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/utils/logging";
import type { SSEEvent } from "../types";
import { generateId } from "../utils/id-generator";

interface SSEHookOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  connectionId?: string;
}

interface SSEHookReturn {
  isConnected: boolean;
  connectionId?: string;
  lastEvent?: SSEEvent;
  error?: string;
  reconnectCount: number;
  connect: () => void;
  disconnect: () => void;
}

export function useSSE(options: SSEHookOptions = {}): SSEHookReturn {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    connectionId: providedConnectionId,
  } = options;

  // Generate stable connectionId only after hydration to avoid SSR/client mismatch
  const [connectionId, setConnectionId] = useState<string | undefined>(
    providedConnectionId,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent>();
  const [error, setError] = useState<string>();
  const [reconnectCount, setReconnectCount] = useState(0);

  const eventSourceRef = useRef<EventSource | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const shouldReconnectRef = useRef(true);
  const reconnectCountRef = useRef(0);

  // Generate connectionId after hydration if not provided
  useEffect(() => {
    if (!connectionId) {
      setConnectionId(generateId());
    }
  }, [connectionId]);

  const connect = useCallback(() => {
    if (
      !connectionId ||
      eventSourceRef.current?.readyState === EventSource.OPEN
    ) {
      return;
    }

    try {
      const url = `/api/sse?connectionId=${connectionId}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        logger.info("SSE connection opened", connectionId);
        setIsConnected(true);
        setError(undefined);
        setReconnectCount(0);
        reconnectCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent: SSEEvent = {
            type: event.type || "message",
            data: JSON.parse(event.data),
            id: event.lastEventId,
          };
          setLastEvent(parsedEvent);
        } catch (parseError) {
          logger.warn("Failed to parse SSE event", event.data);
        }
      };

      eventSource.onerror = (event) => {
        logger.error("SSE connection error", connectionId);
        setIsConnected(false);
        setError("Connection error occurred");

        if (
          shouldReconnectRef.current &&
          reconnectCountRef.current < maxReconnectAttempts
        ) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current += 1;
            setReconnectCount(reconnectCountRef.current);
            connect();
          }, reconnectInterval);
        }
      };

      // Handle custom event types
      const handleCustomEvent = (event: MessageEvent) => {
        try {
          const parsedEvent: SSEEvent = {
            type: event.type,
            data: JSON.parse(event.data),
            id: event.lastEventId,
          };
          setLastEvent(parsedEvent);
        } catch (parseError) {
          logger.warn("Failed to parse custom SSE event", event.data);
        }
      };

      // Listen for specific event types
      eventSource.addEventListener("connection", handleCustomEvent);
      eventSource.addEventListener("notification", handleCustomEvent);
      eventSource.addEventListener("data_update", handleCustomEvent);
      eventSource.addEventListener("progress_update", handleCustomEvent);
      eventSource.addEventListener("system_status", handleCustomEvent);
      eventSource.addEventListener("user_activity", handleCustomEvent);
      eventSource.addEventListener("heartbeat", handleCustomEvent);
    } catch (error) {
      logger.error("Failed to create SSE connection", connectionId);
      setError("Failed to establish connection");
    }
  }, [connectionId, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsConnected(false);
    setError(undefined);
    setReconnectCount(0);
    reconnectCountRef.current = 0;
  }, []);

  // Connect only after connectionId is available
  useEffect(() => {
    if (connectionId) {
      shouldReconnectRef.current = true;
      connect();

      return () => {
        shouldReconnectRef.current = false;
        disconnect();
      };
    }
  }, [connectionId, connect, disconnect]);

  return {
    isConnected,
    connectionId,
    lastEvent,
    error,
    reconnectCount,
    connect,
    disconnect,
  };
}
