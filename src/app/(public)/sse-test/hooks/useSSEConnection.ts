import { useState, useRef, useCallback } from "react";
import type { SSEEvent, SSEStats } from "../types";

export const useSSEConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [stats, setStats] = useState<SSEStats | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addEvent = useCallback(
    (event: SSEEvent, onEventAdd?: (event: SSEEvent) => void) => {
      if (onEventAdd) {
        onEventAdd(event);
      }
    },
    [],
  );

  const disconnect = useCallback(
    (onEventAdd?: (event: SSEEvent) => void) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      setClientId("");
      setStats(null); // Clear stats when disconnecting
      addEvent(
        {
          type: "connection",
          data: { message: "Disconnected from SSE stream" },
          timestamp: new Date().toISOString(),
        },
        onEventAdd,
      );
    },
    [addEvent],
  );

  const connect = useCallback(
    (
      userId: string,
      sessionId: string,
      onEventAdd?: (event: SSEEvent) => void,
    ) => {
      if (isConnected) return;

      const params = new URLSearchParams();
      if (userId.trim()) params.set("userId", userId.trim());
      if (sessionId.trim()) params.set("sessionId", sessionId.trim());

      const url = `/api/sse?${params.toString()}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        addEvent(
          {
            type: "connection",
            data: { message: "Connected to SSE stream" },
            timestamp: new Date().toISOString(),
          },
          onEventAdd,
        );
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const sseEvent = JSON.parse(event.data as string) as SSEEvent;
          addEvent(sseEvent, onEventAdd);

          // Extract client ID from welcome event
          if (
            sseEvent.type === "system:welcome" &&
            sseEvent.data &&
            typeof sseEvent.data === "object" &&
            "clientId" in sseEvent.data
          ) {
            setClientId(sseEvent.data.clientId!);
          }

          // Update stats if available
          if (
            sseEvent.type === "system:stats" &&
            sseEvent.data &&
            typeof sseEvent.data === "object" &&
            "stats" in sseEvent.data
          ) {
            setStats(sseEvent.data.stats!);
          }

          // Update heartbeat stats if available
          if (
            sseEvent.type === "system:heartbeat_stats" &&
            sseEvent.data &&
            typeof sseEvent.data === "object" &&
            "stats" in sseEvent.data
          ) {
            setStats(sseEvent.data.stats!);
          }
        } catch (error) {
          console.error("Error parsing SSE event:", error);
          addEvent(
            {
              type: "error",
              data: { message: "Failed to parse event", error: event.data },
              timestamp: new Date().toISOString(),
            },
            onEventAdd,
          );
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        addEvent(
          {
            type: "connection",
            data: { message: "SSE connection error" },
            timestamp: new Date().toISOString(),
          },
          onEventAdd,
        );
        disconnect(onEventAdd);
      };
    },
    [isConnected, addEvent, disconnect],
  );

  return {
    isConnected,
    clientId,
    stats,
    connect,
    disconnect,
  };
};
