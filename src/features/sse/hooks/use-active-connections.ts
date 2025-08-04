"use client";

import { useState, useEffect, useCallback } from "react";

export interface ActiveConnection {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: number;
  connectionDuration: number;
  lastPing: number;
  timeSinceLastPing: number;
  metadata?: Record<string, unknown>;
}

export function useActiveConnections(refreshInterval: number = 5000) {
  const [connections, setConnections] = useState<ActiveConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/sse/connections");
      if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.statusText}`);
      }

      const data = await response.json();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching SSE connections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch connections on mount and set up polling
  useEffect(() => {
    fetchConnections();

    const interval = setInterval(fetchConnections, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchConnections, refreshInterval]);

  return {
    connections,
    loading,
    error,
    refetch: fetchConnections,
  };
}
