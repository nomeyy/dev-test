# Server-Sent Events (SSE) Implementation

This document provides comprehensive documentation for the SSE layer implemented in the application.

## Overview

The SSE implementation provides a reusable, abstracted layer for real-time server-to-client notifications. It consists of:

- **SSE Manager**: Centralized service for managing client connections and sending events
- **Memory Service**: In-memory storage for client connections (can be extended with Redis for production)
- **API Endpoints**: RESTful endpoints for SSE connections and event sending
- **React Hook**: Client-side hook for consuming SSE events
- **Demo UI**: Testing interface for SSE functionality

## Architecture

### Server-Side Components

#### SSEManager

The main interface for backend services to interact with SSE functionality.

```typescript
import { SSEManager } from "@/features/sse";

const sseManager = SSEManager.getInstance();

// Send to specific user
await sseManager.sendToUser("user123", {
  event: "notification",
  data: { message: "Hello!", type: "info" },
});

// Broadcast to all connected clients
await sseManager.broadcastToAll({
  event: "announcement",
  data: { message: "System maintenance in 5 minutes" },
});
```

#### Memory SSE Service

Handles the actual client connection management, event dispatching, and heartbeat monitoring.

Features:

- Automatic heartbeat/ping messages every 30 seconds
- Connection timeout detection (60 seconds)
- Graceful client cleanup on disconnect
- Event filtering and targeting
- Connection limits (1000 by default)

### API Endpoints

#### `GET /api/sse`

Establishes SSE connection with the server.

**Query Parameters:**

- `clientId` (optional): Custom client identifier
- `userId` (optional): User ID to associate with connection
- `sessionId` (optional): Session ID for connection tracking

**Response:** Server-sent event stream

#### `POST /api/sse/send`

Sends events to specific clients or broadcasts to all.

**Request Body:**

```json
{
  "event": "notification",
  "data": {
    "message": "Hello World",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "userId": "user123", // Send to specific user
  "clientId": "client123", // Send to specific client
  "broadcast": true // Broadcast to all clients
}
```

#### `GET /api/sse/send`

Returns SSE statistics and active client information.

### Client-Side Components

#### useSSE Hook

React hook for consuming SSE events in client components.

```typescript
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { connectionState, lastData, events } = useSSE({
    userId: "user123",
    autoReconnect: true,
    onConnect: () => console.log("Connected to SSE"),
    onDisconnect: () => console.log("Disconnected from SSE"),
  });

  return (
    <div>
      <p>Status: {connectionState}</p>
      <p>Latest: {JSON.stringify(lastData)}</p>
    </div>
  );
}
```

**Hook Options:**

- `clientId`: Custom client ID
- `userId`: User ID for connection
- `sessionId`: Session ID for connection
- `autoReconnect`: Enable automatic reconnection (default: true)
- `reconnectDelay`: Delay between reconnection attempts (default: 3000ms)
- `maxReconnectAttempts`: Maximum reconnection attempts (default: 5)
- `onConnect`: Callback for connection establishment
- `onDisconnect`: Callback for connection loss
- `onError`: Callback for connection errors

## Usage Examples

### Backend Integration

#### Webhook Handler Example

```typescript
import { SSEManager } from "@/features/sse";

export async function handleWebhook(payload: WebhookPayload) {
  const sseManager = SSEManager.getInstance();

  // Notify specific user about the webhook event
  if (payload.userId) {
    await sseManager.notifyUser(
      payload.userId,
      `Webhook received: ${payload.type}`,
      "info",
    );
  }

  // Broadcast system-wide updates
  if (payload.type === "system_update") {
    await sseManager.announce(
      "System has been updated with new features!",
      "medium",
    );
  }
}
```

#### Job Processor Example

```typescript
import { SSEManager } from "@/features/sse";

export async function processJob(job: Job) {
  const sseManager = SSEManager.getInstance();

  // Notify job owner of progress
  await sseManager.sendToUser(job.userId, {
    event: "job_progress",
    data: {
      jobId: job.id,
      status: "processing",
      progress: 50,
    },
  });

  // Process job...

  // Notify completion
  await sseManager.sendToUser(job.userId, {
    event: "job_complete",
    data: {
      jobId: job.id,
      status: "completed",
      result: job.result,
    },
  });
}
```

### Frontend Integration

#### Real-time Notifications Component

```typescript
import { useSSE } from "@/features/sse";
import { useEffect, useState } from "react";

function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { lastData } = useSSE({
    userId,
    onConnect: () => console.log("Connected to notifications"),
  });

  useEffect(() => {
    if (lastData && typeof lastData === 'object' && 'event' in lastData) {
      const event = lastData as { event: string; data: any };

      if (event.event === 'notification') {
        setNotifications(prev => [...prev, event.data]);
      }
    }
  }, [lastData]);

  return (
    <div className="notification-center">
      {notifications.map((notification, index) => (
        <div key={index} className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      ))}
    </div>
  );
}
```

## Event Types

The SSE implementation supports several built-in event types:

### Built-in Events

- `connected`: Sent when client connection is established
- `heartbeat`: Periodic keep-alive messages
- `notification`: User notifications with type and message
- `update`: Real-time data updates
- `announcement`: System-wide announcements

### Custom Events

You can send custom events with any event name:

```typescript
await sseManager.broadcast({
  event: "custom_event",
  data: { customField: "customValue" },
});
```

## Configuration

### Server Configuration

```typescript
const sseManager = SSEManager.getInstance({
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 60000, // 60 seconds
  maxConnections: 1000, // Max concurrent connections
  enableLogging: true, // Enable debug logging
});
```

### Client Configuration

```typescript
const { connectionState } = useSSE({
  autoReconnect: true, // Enable auto-reconnection
  reconnectDelay: 3000, // 3 seconds between attempts
  maxReconnectAttempts: 5, // Max reconnection attempts
});
```

## Error Handling

### Server-Side Errors

- Connection limit exceeded
- Client registration failures
- Event sending failures
- Automatic cleanup of failed connections

### Client-Side Errors

- Connection establishment failures
- Network interruptions
- Automatic reconnection with exponential backoff
- Error callbacks for custom handling

## Testing

### Demo Page

Visit `/sse-demo` to access the testing interface that allows you to:

- Monitor connection status
- Send test events to specific users
- Broadcast events to all connected clients
- View real-time event history

### Manual Testing with curl

```bash
# Establish SSE connection
curl -H "Accept: text/event-stream" \
     "http://localhost:3000/api/sse?userId=test123"

# Send test event
curl -X POST http://localhost:3000/api/sse/send \
     -H "Content-Type: application/json" \
     -d '{"event":"test","data":{"message":"Hello"},"userId":"test123"}'

# Get SSE statistics
curl http://localhost:3000/api/sse/send
```

## Production Considerations

### Scaling

For multi-instance deployments, consider:

- Using Redis-based SSE service instead of in-memory
- Load balancer sticky sessions for SSE connections
- Connection pooling and cleanup strategies

### Security

- Implement authentication for SSE connections
- Validate user permissions for event targeting
- Rate limiting for event sending endpoints
- CORS configuration for cross-origin requests

### Monitoring

- Track connection counts and health
- Monitor event delivery rates
- Log connection failures and errors
- Set up alerts for connection limit breaches

## Troubleshooting

### Common Issues

#### Connections Not Establishing

- Check CORS headers for cross-origin requests
- Verify SSE endpoint is accepting `text/event-stream`
- Check browser developer tools for connection errors

#### Events Not Being Received

- Verify client connection is active
- Check server logs for event sending failures
- Ensure user/client IDs match between sender and receiver

#### Memory Leaks

- Monitor active connection counts
- Check for proper client cleanup on disconnect
- Verify heartbeat mechanism is working

### Debug Mode

Enable detailed logging:

```typescript
const sseManager = SSEManager.getInstance({
  enableLogging: true,
});
```

This will provide detailed logs for:

- Client connections and disconnections
- Event sending attempts and results
- Heartbeat and cleanup operations
- Error conditions and handling
