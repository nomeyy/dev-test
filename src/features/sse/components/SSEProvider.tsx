"use client";

import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useSSE } from "../hooks/useSSE";
import { type SSEEvent } from "../types";

interface SSEContextType {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

const SSEContext = createContext<SSEContextType | null>(null);

interface SSEProviderProps {
  children: ReactNode;
  userId?: string;
  sessionId?: string;
}

export function SSEProvider({ children, userId, sessionId }: SSEProviderProps) {
  const sse = useSSE({ userId, sessionId });

  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>;
}

export function useSSEContext() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSEContext must be used within an SSEProvider");
  }
  return context;
}
