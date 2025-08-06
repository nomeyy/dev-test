"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SSEEvent } from "../types";

export interface SSEHookOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: SSEEvent | null;
  error: string | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (
    eventType: string,
    handler: (event: SSEEvent) => void,
  ) => () => void;
}

export function useSSE(options: SSEHookOptions = {}): SSEHookResult {
  const {
    userId,
    sessionId,
    metadata = {},
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(
    new Map(),
  );
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (sessionId) params.set("sessionId", sessionId);
    Object.entries(metadata).forEach(([key, value]) => params.set(key, value));
    return `/api/sse?${params.toString()}`;
  }, [userId, sessionId, metadata]);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnecting(true);
    setError(null);

    const url = buildUrl();
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setReconnectAttempts(0);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setError("Connection error");
      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        if (reconnectTimeoutRef.current)
          clearTimeout(reconnectTimeoutRef.current);
        const backoff = Math.min(
          reconnectInterval * Math.pow(2, reconnectAttempts),
          30000,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, backoff);
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        setError("Max reconnection attempts reached");
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const rtEvent: SSEEvent = {
          event: event.type,
          data,
          id: event.lastEventId,
        };
        setLastEvent(rtEvent);
        listenersRef.current
          .get("message")
          ?.forEach((handler) => handler(rtEvent));
      } catch {
        console.error("Failed to parse event");
      }
    };

    ["connected", "ping", "notification"].forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const rtEvent: SSEEvent = {
            event: eventType,
            data,
            id: event.lastEventId,
          };
          setLastEvent(rtEvent);
          listenersRef.current
            .get(eventType)
            ?.forEach((handler) => handler(rtEvent));
        } catch {
          console.error(`Failed to parse ${eventType} event`);
        }
      });
    });
  }, [autoReconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setReconnectAttempts(0);
  }, []);

  const addEventListener = useCallback(
    (eventType: string, handler: (event: SSEEvent) => void) => {
      if (!listenersRef.current.has(eventType))
        listenersRef.current.set(eventType, new Set());
      listenersRef.current.get(eventType)!.add(handler);
      return () => {
        listenersRef.current.get(eventType)?.delete(handler);
        if (listenersRef.current.get(eventType)?.size === 0)
          listenersRef.current.delete(eventType);
      };
    },
    [],
  );

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    lastEvent,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    addEventListener,
  };
}
