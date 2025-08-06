"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { logger } from "@/features/shared/logger";

interface SSEMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useSSE() {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [failedHeartbeats, setFailedHeartbeats] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // Start with 2 seconds

  // Use tRPC query for active clients
  const { data: clientsData } = api.sse.getActiveClients.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Use tRPC mutation for sending events
  const sendEventMutation = api.sse.sendEvent.useMutation();

  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connectEventSource = () => {
    const newEventSource = new EventSource("/api/sse");
    setEventSource(newEventSource);
    return newEventSource;
  };

  useEffect(() => {
    const newEventSource = connectEventSource();

    newEventSource.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    newEventSource.addEventListener("connected", (e) => {
      const data = JSON.parse(e.data);
      setClientId(data.clientId);
      setMessages((prev) => [
        {
          type: "connected",
          data,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    });

    newEventSource.addEventListener("ping", (e) => {
      const data = JSON.parse(e.data);
      const now = Date.now();
      setIsConnected(true);
      setLastHeartbeat(now);
      setFailedHeartbeats(data.failedHeartbeats || 0);

      // Add heartbeat to messages
      setMessages((prev) => [
        {
          type: "ping",
          data: {
            timestamp: new Date(now).toISOString(),
            failedHeartbeats: data.failedHeartbeats || 0,
            timeSinceLastHeartbeat: lastHeartbeat ? now - lastHeartbeat : null,
          },
          timestamp: now,
        },
        ...prev,
      ]);

      logger.info("Heartbeat received", {
        clientId,
        timestamp: new Date(now).toISOString(),
        failedHeartbeats: data.failedHeartbeats || 0,
        timeSinceLastHeartbeat: lastHeartbeat ? now - lastHeartbeat : null,
      });
    });

    // Listen for custom message events
    newEventSource.addEventListener("custom_message", (e) => {
      const data = JSON.parse(e.data);
      const now = Date.now();
      setMessages((prev) => [
        {
          type: "message",
          data,
          timestamp: now,
        },
        ...prev,
      ]);

      logger.info("Message received", {
        clientId,
        timestamp: new Date(now).toISOString(),
        data,
      });
    });

    newEventSource.onerror = () => {
      setIsConnected(false);
      newEventSource.close();

      if (reconnectAttempts < maxReconnectAttempts) {
        const currentDelay = reconnectDelay * Math.pow(2, reconnectAttempts); // Exponential backoff
        logger.warn("SSE connection error - attempting reconnect", {
          clientId,
          reconnectAttempt: reconnectAttempts + 1,
          maxAttempts: maxReconnectAttempts,
          delayMs: currentDelay,
          lastHeartbeat: lastHeartbeat
            ? new Date(lastHeartbeat).toISOString()
            : null,
          failedHeartbeats,
        });

        setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connectEventSource();
        }, currentDelay);
      } else {
        logger.error(
          "SSE connection failed after maximum reconnection attempts",
          {
            clientId,
            reconnectAttempts,
            maxReconnectAttempts,
            lastHeartbeat: lastHeartbeat
              ? new Date(lastHeartbeat).toISOString()
              : null,
            failedHeartbeats,
          },
        );
      }
    };

    return () => {
      newEventSource.close();
      setEventSource(null);
      setIsConnected(false);
    };
  }, []);

  const sendEvent = async (
    type: string,
    data: any,
    targetClientId?: string,
  ) => {
    try {
      await sendEventMutation.mutateAsync({
        type,
        data,
        targetClientId,
      });
    } catch (error) {
      console.error("Error sending event:", error);
      throw error;
    }
  };

  // Monitor heartbeat status
  useEffect(() => {
    if (!isConnected || !lastHeartbeat) return;

    const checkHeartbeat = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeat;

      // If we haven't received a heartbeat in 20 seconds (slightly longer than server interval)
      if (timeSinceLastHeartbeat > 20000) {
        setIsConnected(false);
        console.warn("SSE connection may be stale - no recent heartbeat");
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkHeartbeat);
  }, [isConnected, lastHeartbeat]);

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setIsConnected(false);
      setClientId(null);
      setLastHeartbeat(null);
      setFailedHeartbeats(0);
      setReconnectAttempts(0);
      logger.info("SSE connection manually disconnected");
    }
  };

  return {
    messages,
    isConnected,
    clientId,
    activeClients: clientsData?.count ?? 0,
    sendEvent,
    isLoading: sendEventMutation.isPending,
    lastHeartbeat,
    failedHeartbeats,
    disconnect,
  };
}
