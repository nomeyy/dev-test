"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { type SSEEvent, type SSEConnectionOptions } from "../types";

interface ParsedEventData {
  clientId?: string;
  [key: string]: unknown;
}

export function useSSE(options: SSEConnectionOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (isConnectingRef.current || isConnected) {
      return; // Prevent multiple connection attempts
    }

    isConnectingRef.current = true;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const params = new URLSearchParams();
    if (options.userId) params.append("userId", options.userId);
    if (options.sessionId) params.append("sessionId", options.sessionId);

    const url = `/api/sse?${params.toString()}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE: Connection opened");
        setIsConnected(true);
        setError(null);
        isConnectingRef.current = false;
      };

      eventSource.onmessage = (event) => {
        console.log("SSE: Received message event:", event);
        try {
          const eventData =
            typeof event.data === "string"
              ? event.data
              : JSON.stringify(event.data);
          const data = JSON.parse(eventData) as ParsedEventData;
          const eventType =
            typeof event.type === "string" ? event.type : "message";
          const sseEvent: SSEEvent = {
            event: eventType,
            data,
          };

          console.log("SSE: Parsed event:", sseEvent);
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev.slice(-9), sseEvent]); // Keep only last 10 events
        } catch (error) {
          console.error("Error parsing SSE event:", error);
          setError("Failed to parse SSE event");
        }
      };

      eventSource.onerror = (_error) => {
        console.error("SSE connection error:", _error);
        setIsConnected(false);
        setError("SSE connection failed");
        isConnectingRef.current = false;
      };

      // Handle specific event types
      eventSource.addEventListener("connect", (event) => {
        try {
          const eventData =
            typeof event.data === "string"
              ? event.data
              : JSON.stringify(event.data);
          const data = JSON.parse(eventData) as ParsedEventData;
          if (data.clientId && typeof data.clientId === "string") {
            options.onConnect?.(data.clientId);
          }
        } catch (error) {
          console.error("Error parsing connect event:", error);
        }
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const eventData =
            typeof event.data === "string"
              ? event.data
              : JSON.stringify(event.data);
          const data = JSON.parse(eventData) as ParsedEventData;
          const sseEvent: SSEEvent = {
            event: "notification",
            data,
          };
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev.slice(-9), sseEvent]);
        } catch (error) {
          console.error("Error parsing notification event:", error);
        }
      });

      eventSource.addEventListener("ping", (_event) => {
        // Handle ping events silently
      });

      eventSource.addEventListener("test", (event) => {
        console.log("SSE: Received test event:", event);
        try {
          const eventData =
            typeof event.data === "string"
              ? event.data
              : JSON.stringify(event.data);
          const data = JSON.parse(eventData) as ParsedEventData;
          const sseEvent: SSEEvent = {
            event: "test",
            data,
          };
          console.log("SSE: Parsed test event:", sseEvent);
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev.slice(-9), sseEvent]);
        } catch (error) {
          console.error("Error parsing test event:", error);
        }
      });

      // Generic event listener for any other event types
      eventSource.addEventListener("message", (event) => {
        try {
          const eventData =
            typeof event.data === "string"
              ? event.data
              : JSON.stringify(event.data);
          const data = JSON.parse(eventData) as ParsedEventData;
          const sseEvent: SSEEvent = {
            event: "message",
            data,
          };
          setLastEvent(sseEvent);
          setEvents((prev) => [...prev.slice(-9), sseEvent]);
        } catch (error) {
          console.error("Error parsing message event:", error);
        }
      });
    } catch (error) {
      console.error("Error creating EventSource:", error);
      setError("Failed to create SSE connection");
      isConnectingRef.current = false;
    }
  }, [options, isConnected]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      setError(null);
      isConnectingRef.current = false;
      // Reset events when disconnecting to start fresh on reconnect
      setEvents([]);
      setLastEvent(null);
    }
  }, []);

  useEffect(() => {
    // Don't auto-connect to prevent loops
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastEvent,
    events,
    error,
    connect,
    disconnect,
  };
}
