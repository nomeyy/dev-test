# Server-Sent Events (SSE) Feature

A reusable, abstracted Server-Sent Events layer for real-time, server-to-client notifications across the Nomey application.

## Overview

This SSE implementation provides:

- **Centralized SSE Manager**: Tracks active client connections and handles event dispatching
- **Client Connection Management**: Handles connect, disconnect, and error scenarios
- **Targeted Messaging**: Send events to specific clients, users, sessions, or broadcast to all
- **Heartbeat Mechanism**: Keeps connections alive and cleans up dead connections
- **React Hooks**: Easy-to-use hooks for client-side SSE integration
- **Utility Functions**: Simple API for backend modules to send notifications
  wh

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   SSE Manager   │    │  Backend APIs   │
│                 │    │                 │    │                 │
│  useSSE Hook    │◄──►│  Connection     │◄──►│  SSE Utils      │
│  EventSource    │    │  Management     │    │  Webhook Handlers│
│                 │    │  Heartbeat      │    │  Job Processors  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### GET `/api/sse`

Establishes SSE connection with optional query parameters:

- `clientId`: Custom client identifier
- `sessionId`: Session identifier for targeted messaging

### POST `/api/sse`

Sends messages to SSE clients with body:

```json
{
  "event": "notification",
  "data": { "message": "Hello!" },
  "target": "all|user|session|client",
  "targetId": "user123"
}
```

## Usage Examples

### Client-Side (React)

#### Basic SSE Connection

```tsx
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { isConnected, clientId, lastMessage } = useSSE({
    onConnect: (id) => console.log("Connected:", id),
    onMessage: (event) => console.log("Received:", event),
  });

  return (
    <div>
      Status: {isConnected ? "Connected" : "Disconnected"}
      {lastMessage && <pre>{JSON.stringify(lastMessage, null, 2)}</pre>}
    </div>
  );
}
```

#### Listening to Specific Events

```tsx
import { useSSEEvent } from "@/features/sse";

function NotificationListener() {
  useSSEEvent("notification", (data) => {
    // Handle notification data
    showToast(data.message);
  });

  return <div>Listening for notifications...</div>;
}
```

#### Using Notifications Hook

```tsx
import { useSSENotifications } from "@/features/sse";

function NotificationCenter() {
  const { notifications, clearNotifications } = useSSENotifications();

  return (
    <div>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}
      <button onClick={clearNotifications}>Clear All</button>
    </div>
  );
}
```

### Server-Side (Backend)

#### Broadcasting Messages

```ts
import { broadcastSSEMessage } from "@/features/sse";

// Send to all connected clients
await broadcastSSEMessage("system_update", {
  message: "System maintenance in 5 minutes",
  type: "warning",
});
```

#### User-Specific Notifications

```ts
import { sendNotificationToUser } from "@/features/sse";

// Send notification to specific user
await sendNotificationToUser(
  "user123",
  "Upload Complete",
  "Your video has been processed successfully",
  "success",
);
```

#### Session-Based Messaging

```ts
import { sendSSEMessageToSession } from "@/features/sse";

// Send to all clients of a specific session
await sendSSEMessageToSession('session456', 'data_update', {
  userId: 'user123',
  newData: { ... }
});
```

#### Integration with Webhooks

```ts
import { sendNotificationToUser } from "@/features/sse";

// In Mux webhook handler
export async function POST(request: NextRequest) {
  const event = await processWebhook(request);

  if (event.type === "video.asset.ready") {
    await sendNotificationToUser(
      event.data.userId,
      "Video Ready",
      "Your video is now available for playback",
      "success",
    );
  }
}
```

## Features

### Connection Management

- **Automatic Reconnection**: Clients automatically reconnect on connection loss
- **Connection Limits**: Configurable max reconnection attempts
- **Heartbeat**: Regular ping messages to keep connections alive
- **Cleanup**: Automatic cleanup of dead connections

### Message Targeting

- **Broadcast**: Send to all connected clients
- **User-Specific**: Send to all clients of a specific user
- **Session-Specific**: Send to all clients of a specific session
- **Client-Specific**: Send to a specific client

### Event Types

- **Connected**: Sent when client successfully connects
- **Notification**: Standard notification messages
- **System Update**: System-wide announcements
- **Custom Events**: Any custom event type supported

### Error Handling

- **Connection Errors**: Automatic retry with exponential backoff
- **Message Errors**: Graceful handling of malformed messages
- **Resource Cleanup**: Proper cleanup on errors and disconnects

## Configuration

### Heartbeat Settings

```ts
// In sse-manager.ts
private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
private readonly CLIENT_TIMEOUT = 120000; // 2 minutes
```

### Reconnection Settings

```tsx
// In useSSE hook
const { isConnected } = useSSE({
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 5,
});
```

## Security Considerations

- **Authentication**: SSE connections respect user authentication
- **Session Validation**: Messages are scoped to valid sessions
- **Rate Limiting**: Consider implementing rate limiting for message sending
- **CORS**: Proper CORS headers for cross-origin requests

## Performance Considerations

- **Connection Limits**: Monitor active connections to prevent resource exhaustion
- **Message Size**: Keep messages small to minimize bandwidth usage
- **Heartbeat Frequency**: Balance between connection health and server load
- **Memory Management**: Regular cleanup of disconnected clients

## Monitoring

### SSE Manager Statistics

```ts
import { sseManager } from "@/features/sse";

const stats = sseManager.getStats();
console.log("Active connections:", stats.activeConnections);
console.log("Connections by user:", stats.connectionsByUser);
```

### Logging

The SSE manager includes comprehensive logging for:

- Connection events (connect/disconnect)
- Message delivery
- Error scenarios
- Heartbeat operations

## Testing

### Manual Testing

1. Open multiple browser tabs/windows
2. Connect to SSE endpoint
3. Send test messages using the demo component
4. Verify message delivery across all clients

### Automated Testing

```ts
// Test SSE connection
const response = await fetch("/api/sse");
expect(response.headers.get("content-type")).toBe("text/event-stream");

// Test message sending
const messageResponse = await fetch("/api/sse", {
  method: "POST",
  body: JSON.stringify({
    event: "test",
    data: { message: "Hello" },
    target: "all",
  }),
});
expect(messageResponse.status).toBe(200);
```

## Troubleshooting

### Common Issues

1. **Connection Not Establishing**
   - Check if SSE endpoint is accessible
   - Verify authentication is working
   - Check browser console for errors

2. **Messages Not Received**
   - Verify client is connected (check `isConnected` state)
   - Check message format and target parameters
   - Review server logs for delivery errors

3. **High Memory Usage**
   - Monitor active connections with `sseManager.getStats()`
   - Check for proper cleanup of disconnected clients
   - Review heartbeat settings

4. **Reconnection Issues**
   - Verify `maxReconnectAttempts` and `reconnectInterval` settings
   - Check network connectivity
   - Review error handling in `onError` callback

## Future Enhancements

- **Message Persistence**: Store undelivered messages for offline users
- **Message Queuing**: Queue messages when client is disconnected
- **Message Filtering**: Allow clients to subscribe to specific event types
- **Load Balancing**: Support for multiple SSE server instances
- **Analytics**: Track message delivery and engagement metrics
