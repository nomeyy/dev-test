"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  const [urlUserId, setUrlUserId] = useState<string | undefined>(userId);
  const [urlSessionId, setUrlSessionId] = useState<string | undefined>(
    sessionId,
  );

  // Read URL parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserIdParam = urlParams.get("userId");
      const urlSessionIdParam = urlParams.get("sessionId");

      if (urlUserIdParam && !userId) {
        setUrlUserId(urlUserIdParam);
      }
      if (urlSessionIdParam && !sessionId) {
        setUrlSessionId(urlSessionIdParam);
      }
    }
  }, [userId, sessionId]);

  const sse = useSSE({
    userId: urlUserId ?? userId,
    sessionId: urlSessionId ?? sessionId,
  });

  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>;
}

export function useSSEContext() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSEContext must be used within an SSEProvider");
  }
  return context;
}
