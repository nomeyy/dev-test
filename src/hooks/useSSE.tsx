"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSSEConnection } from "@/lib/sse/client";
import type { SSEConnection, SSEOptions } from "@/lib/sse/client";

export interface UseSSEReturn {
  isConnected: boolean;
  clientId: string | null;
  lastMessage: any | null;
  lastEvent: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendTestMessage: (message?: string) => void;
}

export function useSSE(options: SSEOptions = {}): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const connectionRef = useRef<SSEConnection | null>(null);
  const clientRef = useRef<ReturnType<typeof createSSEConnection> | null>(null);
  const isConnectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || isConnected) {
      console.log("SSE: Already connecting or connected, skipping");
      return; // Prevent multiple simultaneous connection attempts
    }

    try {
      isConnectingRef.current = true;
      console.log("SSE: Starting connection...");

      if (clientRef.current) {
        console.log("SSE: Disconnecting existing client");
        clientRef.current.disconnect();
      }

      clientRef.current = createSSEConnection({
        ...options,
        onConnect: (connection) => {
          console.log("SSE: onConnect callback triggered");
          connectionRef.current = connection;
          setIsConnected(true);
          setClientId(connection.clientId);
          console.log("SSE: Connected via hook");
          // Call the original onConnect if provided
          if (options.onConnect) {
            options.onConnect(connection);
          }
        },
        onDisconnect: () => {
          console.log("SSE: onDisconnect callback triggered");
          connectionRef.current = null;
          setIsConnected(false);
          setClientId(null);
          console.log("SSE: Disconnected via hook");
          // Call the original onDisconnect if provided
          if (options.onDisconnect) {
            options.onDisconnect();
          }
        },
        onError: (error) => {
          console.error("SSE: Error in hook:", error);
          // Call the original onError if provided
          if (options.onError) {
            options.onError(error);
          }
        },
        onMessage: (event) => {
          console.log("SSE: Received message in hook:", event);
          console.log("SSE: Setting lastMessage to:", event.data);
          console.log("SSE: Setting lastEvent to:", event.event);
          setLastMessage(event.data);
          setLastEvent(event.event);
          // Call the original onMessage if provided
          if (options.onMessage) {
            options.onMessage(event);
          }
        },
      });

      console.log("SSE: Calling client.connect()");
      await clientRef.current.connect();
      console.log("SSE: client.connect() completed");
    } catch (error) {
      console.error("SSE: Failed to connect:", error);
    } finally {
      isConnectingRef.current = false;
      console.log("SSE: Connection attempt finished");
    }
  }, [options, isConnected]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
  }, []);

  const sendTestMessage = useCallback(
    async (message?: string) => {
      try {
        const response = await fetch("/api/sse/test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "test-message",
            data: {
              message: message || "Hello from authenticated user!",
              timestamp: new Date().toISOString(),
              clientId,
              userId: "authenticated-user",
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send test message");
        }

        console.log("SSE: Test message sent");
      } catch (error) {
        console.error("SSE: Error sending test message:", error);
      }
    },
    [clientId],
  );

  // Auto-connect on mount only if not already connected
  useEffect(() => {
    console.log("SSE: Auto-connect effect triggered");
    console.log("SSE: isConnected:", isConnected);
    console.log("SSE: isConnectingRef.current:", isConnectingRef.current);

    if (!isConnected && !isConnectingRef.current) {
      console.log("SSE: Auto-connecting...");
      connect();
    } else {
      console.log(
        "SSE: Skipping auto-connect - already connected or connecting",
      );
    }

    // Cleanup on unmount
    return () => {
      console.log("SSE: Cleanup - disconnecting");
      disconnect();
    };
  }, []); // Empty dependency array to run only on mount

  return {
    isConnected,
    clientId,
    lastMessage,
    lastEvent,
    connect,
    disconnect,
    sendTestMessage,
  };
}
