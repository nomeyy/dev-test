"use client";

import { useCallback, useMemo } from 'react';
import { useSSE } from './useSSE';
import type { SSEEvent } from '../types';
import { useState } from 'react';

export interface UseSSEEventOptions {
  url?: string;
  withCredentials?: boolean;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoReconnect?: boolean;
}

export interface UseSSEEventReturn<T = any> {
  isConnected: boolean;
  isConnecting: boolean;
  error: Event | null;
  lastEvent: SSEEvent<T> | null;
  events: SSEEvent<T>[];
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  clearEvents: () => void;
}

export function useSSEEvent<T = any>(
  eventType: string,
  options: UseSSEEventOptions = {}
): UseSSEEventReturn<T> {
  const sseHook = useSSE(options);

  // Filter events by event type
  const filteredEvents = useMemo(() => {
    return sseHook.events.filter(event => event.event === eventType) as SSEEvent<T>[];
  }, [sseHook.events, eventType]);

  const filteredLastEvent = useMemo(() => {
    if (sseHook.lastEvent && sseHook.lastEvent.event === eventType) {
      return sseHook.lastEvent as SSEEvent<T>;
    }
    return null;
  }, [sseHook.lastEvent, eventType]);

  const clearEvents = useCallback(() => {
    // This would need to be implemented in the base useSSE hook
    // For now, we'll just clear the filtered events by filtering them out
    // This is a limitation - we can't clear specific event types from the base hook
  }, []);

  return {
    ...sseHook,
    lastEvent: filteredLastEvent,
    events: filteredEvents,
    clearEvents,
  };
}

// Specialized hooks for common event types
export function useSSEHeartbeat(options: UseSSEEventOptions = {}) {
  return useSSEEvent('heartbeat', options);
}

export function useSSESystemNotification(options: UseSSEEventOptions = {}) {
  return useSSEEvent('system', options);
}

export function useSSEErrorNotification(options: UseSSEEventOptions = {}) {
  return useSSEEvent('error', options);
}

export function useSSESuccessNotification(options: UseSSEEventOptions = {}) {
  return useSSEEvent('success', options);
}

export function useSSEConnection(options: UseSSEEventOptions = {}) {
  return useSSEEvent('connected', options);
}
