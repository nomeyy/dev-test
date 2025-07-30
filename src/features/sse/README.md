# SSE (Server-Sent Events) Feature Documentation

## Overview

This SSE feature provides a comprehensive, reusable abstraction layer for implementing real-time server-to-client communication using Server-Sent Events. The system is designed to be easy to use, performant, and follows best practices for production applications.

## Architecture

### Core Components

1. **SSEManager** - Central server-side connection manager
2. **SSEClient** - Client-side connection handler
3. **React Hooks** - Easy React integration
4. **API Endpoints** - RESTful SSE endpoints
5. **Type Definitions** - Complete TypeScript support

### Key Features

- ✅ Centralized connection management
- ✅ User and session-based targeting
- ✅ Automatic heartbeat/ping mechanism
- ✅ Connection cleanup and resource management
- ✅ React hooks for easy client integration
- ✅ TypeScript support throughout
- ✅ Auto-reconnection with backoff
- ✅ Event filtering and broadcasting
- ✅ Error handling and logging
- ✅ Production-ready configuration

## Quick Start

### 1. Server-Side: Sending Events

```typescript
import { getSSEManager } from "@/features/sse";

// Get the SSE manager instance
const sseManager = getSSEManager();

// Send to a specific user
sseManager.sendToUser("user-123", {
  event: "notification",
  data: { message: "Hello!", priority: "high" },
});

// Broadcast to all connected clients
sseManager.broadcast({
  event: "announcement",
  data: { message: "System maintenance in 5 minutes" },
});

// Send to specific clients with filtering
sseManager.sendToClients(
  {
    event: "update",
    data: { status: "processing" },
  },
  {
    userIds: ["user-1", "user-2"],
    customFilter: (client) => client.metadata?.role === "admin",
  },
);
```

### 2. Client-Side: Receiving Events

```tsx
import { useSSEEvent, useSSEState } from "@/features/sse";

function MyComponent() {
  // Listen to specific events
  const sse = useSSEEvent("/api/sse", "notification", (data) => {
    console.log("Received notification:", data);
    // Handle the notification
  });

  // Or use state management
  const [notifications, sseConnection] = useSSEState(
    "/api/sse",
    "notification",
    [],
  );

  return (
    <div>
      <div>Status: {sse.isConnected ? "Connected" : "Disconnected"}</div>
      {notifications.map((notification) => (
        <div key={notification.id}>{notification.message}</div>
      ))}
    </div>
  );
}
```

## API Reference

### Server-Side API

#### SSEManager

```typescript
// Get singleton instance
const manager = getSSEManager(config?: SSEManagerConfig);

// Send events
manager.sendToUser(userId: string, event: SSEEvent): number
manager.sendToClients(event: SSEEvent, filter?: SSEEventFilter): number
manager.broadcast(event: SSEEvent): number

// Connection management
manager.disconnectClient(clientId: string): void
manager.getStats(): ConnectionStats
manager.onClientLifecycle(handler: SSEClientLifecycleHandler): void

// Cleanup
manager.destroy(): void
```

#### Configuration

```typescript
interface SSEManagerConfig {
  heartbeatInterval?: number; // Default: 30000ms (30s)
  cleanupInterval?: number; // Default: 60000ms (1m)
  maxIdleTime?: number; // Default: 300000ms (5m)
  maxClientsPerUser?: number; // Default: 5
  debug?: boolean; // Default: false
}
```

### Client-Side API

#### React Hooks

```typescript
// Basic SSE connection
const sse = useSSE({
  url: "/api/sse",
  autoConnect: true,
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
  debug: false,
});

// Event-specific listener
const sse = useSSEEvent(url, eventType, handler, options);

// State management
const [state, sse] = useSSEState(url, eventType, initialValue, options);
```

#### SSEClient

```typescript
const client = createSSEClient({ url: "/api/sse" });

await client.connect();
client.addEventListener("notification", (data) => console.log(data));
client.disconnect();
client.destroy();
```

## API Endpoints

### GET /api/sse

Establishes SSE connection for authenticated users.

**Query Parameters:**

- `sessionId` (optional) - Custom session identifier
- `metadata` (optional) - JSON metadata for the connection

**Response:** SSE event stream

### POST /api/sse/notify

Sends notifications via SSE.

**Body:**

```json
{
  "event": "notification",
  "data": { "message": "Hello!" },
  "targetUserId": "user-123", // Optional
  "targetClientIds": ["client-1"], // Optional
  "broadcast": false // Optional
}
```

### GET /api/sse/stats

Returns connection statistics (requires authentication).

**Response:**

```json
{
  "stats": {
    "totalClients": 5,
    "authenticatedUsers": 3,
    "clientsPerUser": [
      { "userId": "user-1", "clientCount": 2 },
      { "userId": "user-2", "clientCount": 1 }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Event Types

### Built-in Events

- **`heartbeat`** - Automatic keepalive events (every 30s)
- **`connection`** - Sent when client connects
- **`error`** - Error notifications

### Custom Events

You can send any custom event type:

```typescript
// Server
manager.sendToUser("user-123", {
  event: "order-status-update",
  data: { orderId: "123", status: "shipped", trackingNumber: "ABC123" },
});

// Client
useSSEEvent("/api/sse", "order-status-update", (data) => {
  updateOrderStatus(data.orderId, data.status);
});
```

## Best Practices

### Server-Side

1. **Use the singleton pattern** - Always use `getSSEManager()` instead of creating new instances
2. **Handle errors gracefully** - The manager includes built-in error handling and logging
3. **Monitor connection stats** - Use the stats endpoint to monitor system health
4. **Configure appropriately** - Adjust timeouts and limits based on your needs

```typescript
// Good: Use singleton
const manager = getSSEManager();
manager.sendToUser(userId, event);

// Bad: Don't create multiple instances
const manager1 = new SSEManager();
const manager2 = new SSEManager();
```

### Client-Side

1. **Use React hooks** - They handle connection lifecycle automatically
2. **Handle disconnections** - Always check connection status before assuming events will work
3. **Clean up listeners** - Remove event listeners when components unmount
4. **Use dependencies** - Include relevant values in the dependencies array

```tsx
// Good: Using hooks with proper cleanup
function Component({ userId }) {
  const sse = useSSEEvent("/api/sse", "notification", handleNotification, {
    dependencies: [userId], // Reconnect when userId changes
  });

  return <div>Status: {sse.isConnected ? "Connected" : "Disconnected"}</div>;
}

// Good: Manual cleanup
useEffect(() => {
  const client = createSSEClient({ url: "/api/sse" });
  client.addEventListener("notification", handleNotification);

  return () => {
    client.destroy(); // Important: cleanup
  };
}, []);
```

### Error Handling

1. **Network failures** - The client automatically reconnects with exponential backoff
2. **Server errors** - Check server logs for SSE manager error messages
3. **Authentication** - SSE connections respect authentication state

## Production Considerations

### Performance

- **Connection limits** - Default max 5 connections per user (configurable)
- **Heartbeat optimization** - 30-second intervals balance reliability and performance
- **Memory management** - Automatic cleanup of stale connections every minute

### Security

- **Authentication required** - All SSE endpoints require valid session
- **User isolation** - Users can only receive events targeted to them
- **CORS configured** - Proper CORS headers for cross-origin requests

### Monitoring

```typescript
// Monitor SSE health
const stats = await fetch("/api/sse/stats").then((r) => r.json());
console.log("Active connections:", stats.totalClients);
console.log("Authenticated users:", stats.authenticatedUsers);
```

### Scaling

- **Stateful nature** - SSE connections are tied to specific server instances
- **Load balancing** - Use sticky sessions or implement Redis-based state sharing
- **Resource limits** - Monitor memory usage and connection counts

## Integration Examples

### Webhook Handler

```typescript
// In your webhook handler
import { getSSEManager } from "@/features/sse";

export async function handlePaymentWebhook(webhookData) {
  const manager = getSSEManager();

  // Notify user of payment status
  manager.sendToUser(webhookData.userId, {
    event: "payment-update",
    data: {
      paymentId: webhookData.paymentId,
      status: webhookData.status,
      amount: webhookData.amount,
    },
  });
}
```

### Background Job Updates

```typescript
// In your job processor
import { getSSEManager } from "@/features/sse";

async function processLongRunningJob(jobId: string, userId: string) {
  const manager = getSSEManager();

  // Send progress updates
  manager.sendToUser(userId, {
    event: "job-progress",
    data: { jobId, status: "started", progress: 0 },
  });

  for (let i = 0; i < 100; i++) {
    // Do work...

    manager.sendToUser(userId, {
      event: "job-progress",
      data: { jobId, status: "processing", progress: i + 1 },
    });
  }

  manager.sendToUser(userId, {
    event: "job-complete",
    data: { jobId, status: "completed", result: "success" },
  });
}
```

### Real-time Chat

```tsx
function ChatComponent() {
  const [messages, setMessages] = useState([]);

  // Listen for new messages
  useSSEEvent("/api/sse", "chat-message", (message) => {
    setMessages((prev) => [...prev, message]);
  });

  // Send message function
  const sendMessage = async (text) => {
    await fetch("/api/sse/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "chat-message",
        data: { text, timestamp: Date.now() },
        broadcast: true, // Send to all users
      }),
    });
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.timestamp}>{msg.text}</div>
      ))}
      <input
        onKeyDown={(e) => e.key === "Enter" && sendMessage(e.target.value)}
      />
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Connection not establishing**
   - Check authentication status
   - Verify `/api/sse` endpoint is accessible
   - Check browser network tab for errors

2. **Events not received**
   - Verify event names match exactly
   - Check target user ID is correct
   - Confirm connection is active

3. **Memory leaks**
   - Ensure proper cleanup in useEffect
   - Use React hooks instead of manual client creation
   - Monitor connection counts in stats

### Debug Mode

Enable debug logging:

```typescript
// Server
const manager = getSSEManager({ debug: true });

// Client
const sse = useSSE({ url: "/api/sse", debug: true });
```

### Testing

Visit `/sse-demo` in your application to test SSE functionality with a live interface.

## Migration & Upgrades

This SSE implementation is designed to be:

- **Backward compatible** - Existing code continues to work
- **Extensible** - Easy to add new features
- **Maintainable** - Clear separation of concerns
- **Testable** - Comprehensive TypeScript types and interfaces

For questions or issues, refer to the code documentation and type definitions in the `/src/features/sse` directory.
