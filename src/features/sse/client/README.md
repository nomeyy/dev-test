# SSE Client Utilities

This directory contains client-side utilities for connecting to and managing Server-Sent Events (SSE) streams. The utilities provide a robust, type-safe way to handle real-time events with automatic reconnection, error handling, and event processing helpers.

## Overview

The SSE client utilities consist of:

- **SSEClient**: Main client class for managing SSE connections
- **SSEEventHandlers**: Typed event handlers for common event patterns
- **Event Helpers**: Utilities for debouncing, batching, and filtering events
- **Examples**: Comprehensive usage examples for different scenarios

## Quick Start

### Basic Usage

```typescript
import { SSEClient } from "./sse-client";

// Create and configure client
const client = new SSEClient({
  endpoint: "/api/sse",
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  debug: true,
});

// Handle events
client.on("notification", (data) => {
  console.log("Received notification:", data);
});

// Handle connection state changes
client.onStateChange((state, previousState) => {
  console.log(`Connection: ${previousState} -> ${state}`);
});

// Handle errors
client.onError((error) => {
  console.error("SSE Error:", error);
});

// Connect
await client.connect();
```

### Typed Event Handlers

```typescript
import { SSEEventHandlers } from "./event-helpers";

const eventHandlers = new SSEEventHandlers(client);

// Handle typed notification events
eventHandlers.onNotification((notification) => {
  // notification is typed as NotificationEvent
  showToast(notification.title, notification.message, notification.type);
});

// Handle user updates
eventHandlers.onUserUpdate((update) => {
  // update is typed as UserUpdateEvent
  updateUserProfile(update.field, update.newValue);
});

// Handle system events
eventHandlers.onSystemEvent((event) => {
  // event is typed as SystemEvent
  handleSystemAlert(event.message, event.severity);
});
```

## Configuration Options

### SSEClientConfig

```typescript
interface SSEClientConfig {
  /** SSE endpoint URL */
  endpoint: string;

  /** Automatic reconnection settings */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    initialDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffMultiplier: number;
  };

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Additional headers to send with the connection */
  headers?: Record<string, string>;

  /** Query parameters to include in the connection */
  params?: Record<string, string>;

  /** Enable debug logging */
  debug?: boolean;
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  timeout: 30000,
  headers: {},
  params: {},
  debug: false,
};
```

## Connection States

The SSE client tracks connection state through the `SSEConnectionState` enum:

- `DISCONNECTED`: Not connected
- `CONNECTING`: Attempting to connect
- `CONNECTED`: Successfully connected
- `RECONNECTING`: Attempting to reconnect after failure
- `ERROR`: Connection error occurred
- `CLOSED`: Connection permanently closed

## Event Handling

### Basic Event Handling

```typescript
// Listen for specific event types
client.on("notification", (data, event) => {
  console.log("Notification:", data);
});

// Listen for all messages
client.on("message", (data, event) => {
  console.log("Message:", data);
});

// Remove event listeners
client.off("notification", handler);
client.off("notification"); // Remove all handlers for event
```

### Error Handling

```typescript
client.onError((error, event) => {
  if ("code" in error) {
    // Handle SSE-specific errors
    const sseError = error as SSEError;
    switch (sseError.code) {
      case "CONNECTION_ERROR":
        handleConnectionError(sseError);
        break;
      case "AUTHENTICATION_ERROR":
        redirectToLogin();
        break;
      default:
        handleGenericError(sseError);
    }
  } else {
    // Handle generic errors
    console.error("Generic error:", error.message);
  }
});
```

### State Change Handling

```typescript
client.onStateChange((newState, previousState) => {
  switch (newState) {
    case SSEConnectionState.CONNECTED:
      showSuccessMessage("Connected to real-time updates");
      break;
    case SSEConnectionState.RECONNECTING:
      showInfoMessage("Reconnecting...");
      break;
    case SSEConnectionState.ERROR:
      showErrorMessage("Connection failed");
      break;
    case SSEConnectionState.CLOSED:
      showWarningMessage("Connection closed");
      break;
  }
});
```

## Advanced Features

### Event Debouncing

Use the `EventDebouncer` to handle high-frequency events:

```typescript
import { EventDebouncer } from "./event-helpers";

const debouncer = new EventDebouncer();

client.on("user-typing", (data) => {
  const debouncedHandler = debouncer.debounce(
    `typing-${data.userId}`,
    (data) => showTypingIndicator(data.userId, data.isTyping),
    300, // 300ms delay
  );
  debouncedHandler(data);
});
```

### Event Batching

Use the `EventBatcher` to process multiple events together:

```typescript
import { EventBatcher } from "./event-helpers";

const messageBatcher = new EventBatcher<ChatMessage>((messages) => {
  // Process batch of messages
  messages.forEach((message) => addMessageToChat(message));
  scrollChatToBottom();
}, 100); // 100ms batch window

eventHandlers.onChatMessage((message) => {
  messageBatcher.add(message);
});
```

### Event Filtering

Use the `EventFilter` to filter events by criteria:

```typescript
import { EventFilter } from "./event-helpers";

// Filter events for specific user
const userFilter = EventFilter.forUser("user123");

// Filter events by type
const typeFilter = EventFilter.byType("notification");

// Combine filters
const combinedFilter = EventFilter.and(userFilter, typeFilter);

client.on("message", (payload) => {
  if (combinedFilter(payload)) {
    handleFilteredEvent(payload);
  }
});
```

## Common Use Cases

### 1. Notifications System

```typescript
import { SSEClient, SSEEventHandlers } from "../client";

const client = new SSEClient({ endpoint: "/api/sse" });
const handlers = new SSEEventHandlers(client);

handlers.onNotification((notification) => {
  // Show toast notification
  toast({
    title: notification.title,
    message: notification.message,
    type: notification.type,
  });
});

await client.connect();
```

### 2. Chat Application

```typescript
import { SSEClient, SSEEventHandlers, EventBatcher } from "../client";

const client = new SSEClient({
  endpoint: "/api/sse",
  params: { roomId: "chat-room-123" },
});

const handlers = new SSEEventHandlers(client);

// Batch messages to avoid UI flooding
const messageBatcher = new EventBatcher<ChatMessage>((messages) => {
  messages.forEach((message) => addMessageToChat(message));
}, 100);

handlers.onChatMessage((message) => {
  messageBatcher.add(message);
});

await client.connect();
```

### 3. Real-time Dashboard

```typescript
import { SSEClient } from "../client";

const client = new SSEClient({
  endpoint: "/api/sse",
  params: { type: "dashboard" },
  timeout: 60000, // Longer timeout for dashboard
});

// Handle metrics updates
client.on("metrics", (data) => {
  updateDashboardMetrics(data);
});

// Handle alerts
client.on("alert", (data) => {
  showAlert(data.message, data.severity);
});

await client.connect();
```

### 4. Order Tracking

```typescript
import { SSEClient } from "../client";

const client = new SSEClient({
  endpoint: "/api/sse",
  params: { orderId: "order-123" },
});

client.on("order-status", (data) => {
  updateOrderStatus(data.status, data.timestamp);

  if (data.status === "delivered") {
    showSuccessNotification("Order delivered!");
    client.disconnect(); // No longer need updates
  }
});

await client.connect();
```

## Error Handling Best Practices

### 1. Graceful Degradation

```typescript
client.onError((error) => {
  // Log error for debugging
  console.error("SSE Error:", error);

  // Show user-friendly message
  showErrorToast("Connection issue", "Some features may not work properly");

  // Fall back to polling if needed
  if (error.message.includes("not supported")) {
    startPollingFallback();
  }
});
```

### 2. Authentication Handling

```typescript
client.onError((error) => {
  if ("code" in error && error.code === "AUTHENTICATION_ERROR") {
    // Clear local auth state
    clearAuthToken();

    // Redirect to login
    window.location.href = "/login";
  }
});
```

### 3. Network Recovery

```typescript
client.onStateChange((state, previousState) => {
  if (
    state === SSEConnectionState.CONNECTED &&
    previousState === SSEConnectionState.RECONNECTING
  ) {
    // Connection restored, refresh any missed data
    refreshMissedData();
    showSuccessToast("Connection restored");
  }
});
```

## Testing

### Unit Testing

```typescript
import { SSEClient } from "./sse-client";

describe("SSEClient", () => {
  let client: SSEClient;

  beforeEach(() => {
    client = new SSEClient({
      endpoint: "/api/sse",
      debug: false,
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  it("should handle connection state changes", () => {
    const stateHandler = jest.fn();
    client.onStateChange(stateHandler);

    // Test state changes
    expect(client.getState()).toBe(SSEConnectionState.DISCONNECTED);
  });

  it("should handle events correctly", () => {
    const eventHandler = jest.fn();
    client.on("test-event", eventHandler);

    // Simulate event
    // ... test implementation
  });
});
```

### Integration Testing

```typescript
import { SSEClient } from "./sse-client";

describe("SSE Integration", () => {
  it("should connect and receive events", async () => {
    const client = new SSEClient({
      endpoint: "http://localhost:3000/api/sse",
    });

    const eventPromise = new Promise((resolve) => {
      client.on("test-event", resolve);
    });

    await client.connect();

    // Trigger server-side event
    await fetch("/api/trigger-event", { method: "POST" });

    // Wait for event
    const event = await eventPromise;
    expect(event).toBeDefined();

    client.disconnect();
  });
});
```

## Performance Considerations

### 1. Memory Management

```typescript
// Always clean up event listeners
const cleanup = () => {
  client.off("notification", notificationHandler);
  client.offError(errorHandler);
  client.offStateChange(stateHandler);
  client.disconnect();
};

// Clean up on component unmount
useEffect(() => cleanup, []);
```

### 2. Event Batching

```typescript
// Use batching for high-frequency events
const batcher = new EventBatcher<MetricUpdate>((updates) => {
  // Process all updates at once
  updateMetrics(updates);
}, 100);

client.on("metric-update", (update) => {
  batcher.add(update);
});
```

### 3. Selective Event Handling

```typescript
// Only listen for events you need
client.on("user-notification", handler);

// Don't listen for all messages unless necessary
// client.on('message', handler); // Avoid if possible
```

## Browser Compatibility

The SSE client utilities use the standard `EventSource` API, which is supported in:

- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge 79+
- iOS Safari 4+
- Android Browser 4.4+

For older browsers, consider using a polyfill like `eventsource-polyfill`.

## Troubleshooting

### Common Issues

1. **Connection fails immediately**
   - Check endpoint URL
   - Verify server is running
   - Check CORS configuration

2. **Events not received**
   - Verify event names match server
   - Check server-side event formatting
   - Enable debug logging

3. **Frequent reconnections**
   - Check network stability
   - Verify server keeps connections alive
   - Adjust heartbeat settings

4. **Memory leaks**
   - Always remove event listeners
   - Disconnect clients when done
   - Clear timers and batchers

### Debug Mode

Enable debug mode to see detailed logging:

```typescript
const client = new SSEClient({
  endpoint: "/api/sse",
  debug: true, // Enable debug logging
});
```

This will log:

- Connection attempts
- State changes
- Received events
- Errors and reconnection attempts
