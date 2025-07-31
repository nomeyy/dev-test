import { useState, useRef, useCallback } from "react";
import { SSEEvent, SSEStats } from "../types";

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

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          addEvent(sseEvent, onEventAdd);

          // Extract client ID from connection event
          if (sseEvent.type === "system:connected" && sseEvent.data.clientId) {
            setClientId(sseEvent.data.clientId);
          }

          // Update stats if available
          if (sseEvent.data.stats) {
            setStats(sseEvent.data.stats);
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

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        addEvent(
          {
            type: "error",
            data: { message: "Connection error occurred" },
            timestamp: new Date().toISOString(),
          },
          onEventAdd,
        );
        disconnect(onEventAdd);
      };
    },
    [isConnected, addEvent],
  );

  const disconnect = useCallback(
    (onEventAdd?: (event: SSEEvent) => void) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      setClientId("");
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

  return {
    isConnected,
    clientId,
    stats,
    connect,
    disconnect,
  };
};
