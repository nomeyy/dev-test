"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSSE } from "../hooks/useSSE";
import type { SSEEvent } from "../types";

/**
 * SSE Context interface
 */
interface SSEContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: Event | null;
  lastEvent: SSEEvent | null;
  connect: () => void;
  disconnect: () => void;
  sendEvent: (event: Omit<SSEEvent, "timestamp">) => Promise<unknown>;
  sendToUser: (
    userId: string,
    event: Omit<SSEEvent, "timestamp">,
  ) => Promise<unknown>;
}

/**
 * SSE Context
 */
const SSEContext = createContext<SSEContextType | null>(null);

/**
 * SSE Provider Props
 */
interface SSEProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

/**
 * SSE Provider Component
 * Provides SSE connection context to child components
 */
export function SSEProvider({
  children,
  url,
  autoConnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
  onOpen,
  onClose,
  onError,
  onMessage,
}: SSEProviderProps) {
  const sse = useSSE({
    url,
    autoConnect,
    reconnectInterval,
    maxReconnectAttempts,
    onOpen,
    onClose,
    onError,
    onMessage,
  });

  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>;
}

/**
 * Hook to use SSE context
 */
export function useSSEContext(): SSEContextType {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSEContext must be used within an SSEProvider");
  }
  return context;
}

/**
 * Hook to use SSE connection status
 */
export function useSSEStatus() {
  const { isConnected, isConnecting, error } = useSSEContext();
  return { isConnected, isConnecting, error };
}

/**
 * Hook to use SSE events
 */
export function useSSEEvents() {
  const { lastEvent, sendEvent, sendToUser } = useSSEContext();
  return { lastEvent, sendEvent, sendToUser };
}
