"use client";

import { z } from "zod";
import { useState, useCallback, useRef, useEffect } from "react";

export interface SSEEvent<T = unknown> {
  id?: string;
  type: string;
  data: T;
  timestamp: number;
}

export interface SSEMetrics {
  connections: {
    active: number;
    total: number;
    byUser: number;
    bySession: number;
  };
  events: {
    sent: number;
    received: number;
    failed: number;
    rate: number;
  };
  performance: {
    memoryUsageMB: number;
    uptime: number;
    averageLatency: number;
  };
}

export interface SSEHealth {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastHeartbeat: number | null;
  connectionUptime: number;
  reconnectAttempts: number;
}

export interface ConnectionOptions {
  userId?: string;
  sessionId?: string;
}

export interface SendEventParams<T = unknown> {
  target: "client" | "user" | "session" | "broadcast" | "all";
  targetId?: string;
  event: {
    type: string;
    data: T;
    id?: string;
  };
}

export interface SendEventResult {
  success: boolean;
  data: {
    sentCount: number;
    failedCount: number;
    stats?: {
      activeConnections: number;
      totalConnections: number;
      eventRate: number;
    };
  };
}

// Type for MessageEvent from EventSource
interface SSEMessageEvent extends MessageEvent {
  lastEventId: string;
}

const MetricsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    metrics: z.object({
      connections: z.object({
        active: z.number(),
        total: z.number(),
        byUser: z.number(),
        bySession: z.number(),
      }),
      events: z.object({
        sent: z.number(),
        received: z.number(),
        failed: z.number(),
        rate: z.number(),
      }),
      performance: z.object({
        memoryUsageMB: z.number(),
        uptime: z.number(),
        averageLatency: z.number(),
      }),
    }),
  }),
});

const SendEventResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    sentCount: z.number(),
    failedCount: z.number(),
    stats: z
      .object({
        activeConnections: z.number(),
        totalConnections: z.number(),
        eventRate: z.number(),
      })
      .optional(),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});

// Generic SSE data schema - accepts any valid JSON
const SSEDataSchema = z.unknown();

// Connection event data schema
const ConnectionEventDataSchema = z
  .object({
    clientId: z.string().optional(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    timestamp: z.number().optional(),
  })
  .passthrough();

// Heartbeat data schema
const HeartbeatDataSchema = z
  .object({
    timestamp: z.number().optional(),
  })
  .passthrough();

export interface UseSSEConnectionReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  events: SSEEvent<unknown>[];
  metrics: SSEMetrics | null;
  health: SSEHealth;
  connect: (options?: ConnectionOptions) => void;
  disconnect: () => void;
  sendEvent: <T = unknown>(
    params: SendEventParams<T>,
  ) => Promise<SendEventResult>;
  clearEvents: () => void;
}

export function useSSEConnection(): UseSSEConnectionReturn {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SSEEvent<unknown>[]>([]);
  const [metrics, setMetrics] = useState<SSEMetrics | null>(null);
  const [health, setHealth] = useState<SSEHealth>({
    status: "unknown",
    lastHeartbeat: null,
    connectionUptime: 0,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionStartRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionOptionsRef = useRef<ConnectionOptions>({});

  // Use ref for received count to avoid stale closure
  const receivedCountRef = useRef(0);

  // Handle incoming events (defined early as it's used in connect)
  const handleEvent = useCallback(
    (event: SSEEvent<unknown>, isLocalEvent = false) => {
      console.log("Received event:", event);
      // Only increment the received count for actual SSE events from server, not local events
      if (!isLocalEvent) {
        receivedCountRef.current += 1;
      }
      setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
    },
    [],
  );

  // Fetch metrics function (defined early as it's used in connect)
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/sse/metrics");
      if (response.ok) {
        const rawData = (await response.json()) as unknown;
        const parseResult = MetricsResponseSchema.safeParse(rawData);

        if (parseResult.success && parseResult.data.data.metrics) {
          // Update metrics with local received count from ref
          const updatedMetrics: SSEMetrics = {
            ...parseResult.data.data.metrics,
            events: {
              ...parseResult.data.data.metrics.events,
              received: receivedCountRef.current,
            },
          };
          setMetrics(updatedMetrics);
        } else if (!parseResult.success) {
          console.error("Invalid metrics response:", parseResult.error);
        }
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
    connectionStartRef.current = null;
  }, []);

  // Connect to SSE
  const connect = useCallback(
    (options: ConnectionOptions = {}) => {
      if (eventSourceRef.current) {
        console.warn("Already connected");
        return;
      }

      setConnecting(true);
      setError(null);
      connectionOptionsRef.current = options;

      // Reset session metrics when connecting
      receivedCountRef.current = 0;
      setEvents([]); // Clear previous events

      // Build query params
      const params = new URLSearchParams();
      if (options.userId) params.append("userId", options.userId);
      if (options.sessionId) params.append("sessionId", options.sessionId);

      const url = `/api/sse${params.toString() ? `?${params}` : ""}`;

      try {
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;
        connectionStartRef.current = Date.now();

        eventSource.onopen = () => {
          console.log("SSE connection opened");
          setConnected(true);
          setConnecting(false);
          setError(null);
          setHealth((prev) => ({
            ...prev,
            status: "healthy",
            reconnectAttempts: 0,
          }));

          // Fetch metrics immediately on connection
          void fetchMetrics();

          // Then start fetching metrics periodically
          metricsIntervalRef.current = setInterval(() => {
            void fetchMetrics();
          }, 5000);
        };

        eventSource.onerror = (err) => {
          console.error("SSE connection error:", err);
          setConnecting(false);

          if (eventSource.readyState === EventSource.CLOSED) {
            setConnected(false);
            setError("Connection closed");
            setHealth((prev) => ({
              ...prev,
              status: "unhealthy",
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            cleanup();
          } else {
            setError("Connection error");
            setHealth((prev) => ({
              ...prev,
              status: "degraded",
            }));
          }
        };

        // Handle different event types
        eventSource.onmessage = (event) => {
          try {
            const parsedData = SSEDataSchema.parse(
              JSON.parse(event.data as string),
            );
            handleEvent({
              type: "message",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse message:", err);
          }
        };

        // System events
        eventSource.addEventListener("system:heartbeat", (event) => {
          const messageEvent = event as SSEMessageEvent;
          setHealth((prev) => ({
            ...prev,
            status: "healthy",
            lastHeartbeat: Date.now(),
            connectionUptime: connectionStartRef.current
              ? Date.now() - connectionStartRef.current
              : 0,
          }));
          // Also add to events log for visibility
          let heartbeatData = {};
          if (messageEvent.data) {
            try {
              const parsed = HeartbeatDataSchema.parse(
                JSON.parse(messageEvent.data as string),
              );
              heartbeatData = parsed;
            } catch (err) {
              console.error("Failed to parse heartbeat data:", err);
            }
          }
          handleEvent({
            type: "heartbeat",
            data: heartbeatData,
            timestamp: Date.now(),
          });
        });

        eventSource.addEventListener(
          "system:connection:established",
          (event) => {
            const messageEvent = event as SSEMessageEvent;
            try {
              const parsedData = ConnectionEventDataSchema.parse(
                JSON.parse(messageEvent.data as string),
              );
              handleEvent({
                id: messageEvent.lastEventId,
                type: "connection_established",
                data: parsedData,
                timestamp: Date.now(),
              });
            } catch (err) {
              console.error("Failed to parse connection event:", err);
            }
          },
        );

        eventSource.addEventListener("system:connection:closed", (event) => {
          const messageEvent = event as SSEMessageEvent;
          try {
            const parsedData = ConnectionEventDataSchema.parse(
              JSON.parse(messageEvent.data as string),
            );
            handleEvent({
              id: messageEvent.lastEventId,
              type: "connection_closed",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse close event:", err);
          }
        });

        // Custom events
        eventSource.addEventListener("notification", (event) => {
          const messageEvent = event as SSEMessageEvent;
          try {
            const parsedData = SSEDataSchema.parse(
              JSON.parse(messageEvent.data as string),
            );
            handleEvent({
              id: messageEvent.lastEventId,
              type: "notification",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse notification:", err);
          }
        });

        eventSource.addEventListener("update", (event) => {
          const messageEvent = event as SSEMessageEvent;
          try {
            const parsedData = SSEDataSchema.parse(
              JSON.parse(messageEvent.data as string),
            );
            handleEvent({
              id: messageEvent.lastEventId,
              type: "update",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse update:", err);
          }
        });

        eventSource.addEventListener("broadcast", (event) => {
          const messageEvent = event as SSEMessageEvent;
          try {
            const parsedData = SSEDataSchema.parse(
              JSON.parse(messageEvent.data as string),
            );
            handleEvent({
              id: messageEvent.lastEventId,
              type: "broadcast",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse broadcast:", err);
          }
        });

        // Add chat event listener
        eventSource.addEventListener("chat", (event) => {
          const messageEvent = event as SSEMessageEvent;
          try {
            const parsedData = SSEDataSchema.parse(
              JSON.parse(messageEvent.data as string),
            );
            handleEvent({
              id: messageEvent.lastEventId,
              type: "chat",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse chat:", err);
          }
        });

        // Add alert event listener
        eventSource.addEventListener("alert", (event) => {
          const messageEvent = event as SSEMessageEvent;
          try {
            const parsedData = SSEDataSchema.parse(
              JSON.parse(messageEvent.data as string),
            );
            handleEvent({
              id: messageEvent.lastEventId,
              type: "alert",
              data: parsedData,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to parse alert:", err);
          }
        });
      } catch (err) {
        console.error("Failed to create EventSource:", err);
        setError("Failed to connect");
        setConnecting(false);
      }
    },
    [cleanup, fetchMetrics, handleEvent],
  );

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    cleanup();
    setConnected(false);
    setError(null);
    setHealth({
      status: "unknown",
      lastHeartbeat: null,
      connectionUptime: 0,
      reconnectAttempts: 0,
    });
    receivedCountRef.current = 0;
  }, [cleanup]);

  // Send event via API
  const sendEvent = useCallback(
    async <T = unknown>(params: SendEventParams<T>) => {
      try {
        const response = await fetch("/api/sse/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const rawError = (await response.json()) as unknown;
          const errorParse = ErrorResponseSchema.safeParse(rawError);
          const errorMessage = errorParse.success
            ? (errorParse.data.error ??
              errorParse.data.message ??
              "Failed to send event")
            : "Failed to send event";
          throw new Error(errorMessage);
        }

        const rawResult = (await response.json()) as unknown;
        const parseResult = SendEventResponseSchema.safeParse(rawResult);

        if (!parseResult.success) {
          throw new Error("Invalid response from server");
        }

        const result = parseResult.data;

        // Add a local event to show the send was successful (don't count as received)
        handleEvent(
          {
            type: "event_sent",
            data: {
              ...result.data,
              originalEvent: params.event,
            },
            timestamp: Date.now(),
          },
          true,
        ); // Mark as local event

        return result as SendEventResult;
      } catch (err) {
        console.error("Failed to send event:", err);
        throw err;
      }
    },
    [handleEvent],
  );

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Update connection uptime
  useEffect(() => {
    if (connected && connectionStartRef.current) {
      const interval = setInterval(() => {
        setHealth((prev) => ({
          ...prev,
          connectionUptime: Date.now() - connectionStartRef.current!,
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [connected]);

  return {
    connected,
    connecting,
    error,
    events,
    metrics,
    health,
    connect,
    disconnect,
    sendEvent,
    clearEvents,
  };
}
