/**
 * React SSE Provider for providing SSE context to components
 */

"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { getSSEManager } from "../services/sse-manager";
import type { SSEManagerConfig, SSEEvent, SSEEventFilter } from "../types";

interface SSEContextValue {
  /** Send event to specific clients */
  sendToClients: (event: SSEEvent, filter?: SSEEventFilter) => number;
  /** Broadcast event to all clients */
  broadcast: (event: SSEEvent) => number;
  /** Send event to user */
  sendToUser: (userId: string, event: SSEEvent) => number;
  /** Get connection statistics */
  getStats: () => {
    totalClients: number;
    authenticatedUsers: number;
    clientsPerUser: Array<{ userId: string; clientCount: number }>;
  };
}

const SSEContext = createContext<SSEContextValue | null>(null);

export interface SSEProviderProps {
  children: React.ReactNode;
  config?: SSEManagerConfig;
}

/**
 * SSE Provider component for server-side SSE management
 * Note: This is primarily for server-side usage and admin interfaces
 */
export function SSEProvider({ children, config }: SSEProviderProps) {
  const managerRef = useRef(getSSEManager(config));

  useEffect(() => {
    // Initialize manager with config
    if (config) {
      managerRef.current = getSSEManager(config);
    }

    return () => {
      // Cleanup is handled by the singleton manager
    };
  }, [config]);

  const contextValue: SSEContextValue = {
    sendToClients: (event: SSEEvent, filter?: SSEEventFilter) => {
      return managerRef.current.sendToClients(event, filter);
    },
    broadcast: (event: SSEEvent) => {
      return managerRef.current.broadcast(event);
    },
    sendToUser: (userId: string, event: SSEEvent) => {
      return managerRef.current.sendToUser(userId, event);
    },
    getStats: () => {
      return managerRef.current.getStats();
    },
  };

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
}

/**
 * Hook to access SSE context for server-side operations
 */
export function useSSEContext(): SSEContextValue {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSEContext must be used within an SSEProvider");
  }
  return context;
}
