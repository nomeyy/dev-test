# Server-Sent Events (SSE) Feature

A reusable, abstracted Server-Sent Events layer that enables real-time, server-to-client notifications across the application.

## Features

- **Centralized SSE Manager**: Tracks active client connections and manages connection lifecycle
- **Flexible Targeting**: Send messages to all clients, specific users, sessions, or individual clients
- **Automatic Heartbeat**: Keeps connections alive with periodic ping messages
- **Connection Cleanup**: Properly handles disconnections and resource cleanup
- **Error Handling**: Comprehensive error handling and logging
- **React Integration**: Custom hook for easy client-side integration
- **Auto-reconnection**: Automatic reconnection with configurable retry logic

## Architecture

```
src/features/sse/
├── types/           # TypeScript type definitions
├── services/        # Core SSE management services
├── hooks/           # React hooks for client-side usage
├── components/      # Demo and utility components
└── README.md        # This documentation
```

## Quick Start

### 1. Server-Side Setup

The SSE manager is automatically initialized when the API route is accessed. You can also initialize it manually:

```typescript
import { initializeSSE } from "@/features/sse";

// Initialize with custom configuration
initializeSSE({
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  cleanupInterval: 60000, // 1 minute
});
```

### 2. Client-Side Usage

```typescript
import { useSSE } from '@/features/sse';

function MyComponent() {
  const { isConnected, lastEvent, connect, disconnect } = useSSE({
    onMessage: (event) => {
      console.log('Received SSE message:', event);
    },
    onConnect: (event) => {
      console.log('Connected to SSE:', event);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {lastEvent && (
        <p>Last message: {JSON.stringify(lastEvent.data)}</p>
      )}
    </div>
  );
}
```

### 3. Sending Messages from Backend

```typescript
import { broadcastToAll, sendToUser, sendToSession } from "@/features/sse";

// Send to all connected clients
broadcastToAll("notification", {
  message: "Hello everyone!",
  timestamp: Date.now(),
});

// Send to specific user
sendToUser("user123", "user-notification", {
  message: "Hello user!",
  userId: "user123",
});

// Send to specific session
sendToSession("session456", "session-update", {
  message: "Session updated",
  sessionId: "session456",
});
```

## API Reference

### Server-Side Services

#### `initializeSSE(config?)`

Initialize the SSE manager with optional configuration.

**Parameters:**

- `config` (optional): `SSEManagerConfig`
  - `heartbeatInterval`: Interval for heartbeat messages (default: 30000ms)
  - `maxConnections`: Maximum number of concurrent connections (default: 1000)
  - `cleanupInterval`: Interval for cleanup of stale connections (default: 60000ms)

#### `broadcastToAll(event, data)`

Send a message to all connected clients.

#### `sendToUser(userId, event, data)`

Send a message to all connections of a specific user.

#### `sendToSession(sessionId, event, data)`

Send a message to all connections of a specific session.

#### `sendToClient(clientId, event, data)`

Send a message to a specific client.

#### `sendMessage(message)`

Send a custom message with full control over targeting.

**Parameters:**

- `message`: `SSEMessage`
  - `event`: Event name
  - `data`: Event payload
  - `target`: 'all' | 'user' | 'session' | 'client'
  - `targetId`: Target identifier (required for user/session/client targeting)

### Client-Side Hook

#### `useSSE(options?)`

React hook for SSE client functionality.

**Options:**

- `url`: SSE endpoint URL (default: '/api/sse')
- `autoConnect`: Auto-connect on mount (default: true)
- `reconnectInterval`: Reconnection interval (default: 5000ms)
- `maxReconnectAttempts`: Maximum reconnection attempts (default: 5)
- `onConnect`: Callback when connection is established
- `onDisconnect`: Callback when connection is lost
- `onError`: Callback when connection error occurs
- `onMessage`: Callback when message is received

**Returns:**

- `isConnected`: Connection status
- `isConnecting`: Connecting status
- `error`: Error message if any
- `lastEvent`: Last received event
- `connect`: Function to manually connect
- `disconnect`: Function to manually disconnect
- `reconnect`: Function to reconnect

## API Endpoints

### `GET /api/sse`

Establishes an SSE connection. Automatically handles:

- Client registration
- Session/user identification
- Connection lifecycle management
- Automatic cleanup on disconnect

### `POST /api/sse/test`

Test endpoint for sending SSE messages (for demo purposes).

**Request Body:**

```json
{
  "event": "test-message",
  "data": {
    "message": "Hello from server!",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "target": "all" // or "user", "session", "client"
}
```

## Demo

Visit `/sse-demo` to see the SSE functionality in action. The demo includes:

- Connection status indicator
- Manual connect/disconnect controls
- Test message sending
- Real-time message display
- Connection statistics

## Integration Examples

### Webhook Integration

```typescript
// In a webhook handler
import { sendToUser } from "@/features/sse";

export async function handleWebhook(req: Request) {
  const { userId, event, data } = await req.json();

  // Send real-time notification to user
  sendToUser(userId, "webhook-received", {
    event,
    data,
    timestamp: Date.now(),
  });
}
```

### Background Job Integration

```typescript
// In a background job processor
import { broadcastToAll } from "@/features/sse";

export async function processJob() {
  // Process job...

  // Notify all clients about job completion
  broadcastToAll("job-completed", {
    jobId: "job123",
    status: "completed",
    timestamp: Date.now(),
  });
}
```

### User Activity Integration

```typescript
// In user activity handlers
import { sendToUser } from "@/features/sse";

export async function handleUserLogin(userId: string) {
  // Login logic...

  // Notify user about successful login
  sendToUser(userId, "login-success", {
    message: "Successfully logged in",
    timestamp: Date.now(),
  });
}
```

## Best Practices

1. **Connection Limits**: Set appropriate `maxConnections` based on your server capacity
2. **Heartbeat Intervals**: Use reasonable heartbeat intervals (15-60 seconds)
3. **Error Handling**: Always handle connection errors and implement reconnection logic
4. **Resource Cleanup**: Ensure connections are properly cleaned up on disconnect
5. **Message Size**: Keep SSE messages small and focused
6. **Targeting**: Use specific targeting (user/session) instead of broadcasting when possible

## Troubleshooting

### Common Issues

1. **Connection Timeouts**: Check heartbeat interval and network configuration
2. **Memory Leaks**: Ensure proper cleanup of disconnected clients
3. **High CPU Usage**: Monitor connection count and adjust limits
4. **Browser Limits**: Be aware of browser connection limits (usually 6 per domain)

### Debugging

Enable debug logging to troubleshoot issues:

```typescript
// The SSE manager uses the application logger
// Check logs for connection events, errors, and statistics
```

## Performance Considerations

- **Connection Pooling**: The manager efficiently handles multiple connections
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Scalability**: Consider horizontal scaling for high-connection scenarios
- **Monitoring**: Use `getSSEStats()` to monitor connection health

## Security Considerations

- **Authentication**: SSE connections respect session authentication
- **Rate Limiting**: Consider implementing rate limiting for SSE endpoints
- **CORS**: Proper CORS headers are set for cross-origin requests
- **Input Validation**: Validate all message data before broadcasting
