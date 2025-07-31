// SSE Demo Constants
export const SSE_DEMO_CONFIG = {
  ENDPOINTS: {
    SSE_STREAM: "/api/sse",
    TRIGGER: "/api/sse/trigger",
  },
  EVENTS: {
    NOTIFICATION: "notification",
    ALERT: "alert",
  },
  MESSAGES: {
    CONNECTED: "Connected to SSE",
    CONNECTION_ERROR: "SSE connection error",
    TRIGGER_ERROR: "Failed to trigger event",
  },
  UI: {
    REFRESH_INTERVAL: 100,
    MESSAGE_DISPLAY_LIMIT: 100,
  },
} as const;

export const SSE_DEMO_MESSAGE_TYPES = {
  CONNECTION: "connection",
  NOTIFICATION: "notification",
  ALERT: "alert",
  ERROR: "error",
  HEARTBEAT: "heartbeat",
} as const;

export type SSEDemoMessageType =
  (typeof SSE_DEMO_MESSAGE_TYPES)[keyof typeof SSE_DEMO_MESSAGE_TYPES];
