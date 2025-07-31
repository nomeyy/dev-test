// SSE Configuration Constants
export const SSE_CONFIG = {
  HEARTBEAT_MS: 25000,
  CONNECTION_TIMEOUT_MS: 30000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_MS: 1000,

  EVENTS: {
    NOTIFICATION: "notification",
    ALERT: "alert",
    HEARTBEAT: "heartbeat",
    CONNECTION: "connection",
    ERROR: "error",
  },

  ENDPOINTS: {
    SSE_STREAM: "/api/sse",
    TRIGGER: "/api/sse/trigger",
    STATS: "/api/sse/stats",
  },

  LOGGER: {
    PREFIX: "SSE",
    MESSAGES: {
      CLIENT_CONNECTED: "Client connected",
      CLIENT_DISCONNECTED: "Client disconnected",
      CONNECTION_ERROR: "Error closing client connection",
      BROADCAST_SENT: "Broadcast sent",
      HEARTBEAT_FAILED: "Heartbeat failed for client",
      EVENT_SEND_FAILED: "Failed to send event to client",
      INACTIVE_CLIENT: "Attempted to send event to inactive client",
    },
  },

  UI: {
    MESSAGE_DISPLAY_LIMIT: 50,
    STATUS_CONNECTED: "Connected to SSE Stream",
    STATUS_DISCONNECTED: "Disconnected",
    BUTTON_SEND_NOTIFICATION: "Send Notification",
    BUTTON_SEND_ALERT: "Send Alert",
    BUTTON_CLEAR_MESSAGES: "Clear Messages",
  },

  MESSAGES: {
    CONNECTED: "Successfully connected to SSE stream",
    CONNECTION_ERROR: "Connection error occurred",
    TRIGGER_ERROR: "Failed to trigger event",
    TEST_NOTIFICATION: "Test notification message",
    TEST_ALERT: "Test alert message",
  },
} as const;

export type SSEEventType =
  (typeof SSE_CONFIG.EVENTS)[keyof typeof SSE_CONFIG.EVENTS];
