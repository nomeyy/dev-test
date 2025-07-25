# Server-Sent Events (SSE) Feature

A comprehensive, production-ready Server-Sent Events implementation for real-time communication between server and client.

## Overview

This SSE system provides:

- **Centralized Connection Management**: Track and manage all client connections
- **Event Broadcasting**: Send events to specific users, sessions, or broadcast to all
- **Heartbeat System**: Keep connections alive with automatic ping/pong
- **Auto-Reconnection**: Client-side automatic reconnection with exponential backoff
- **Resource Cleanup**: Proper cleanup to prevent memory leaks
- **Backend Integration**: Easy-to-use utilities for other services to send events

## Changes Made During Development

### Implementation

- **Core SSE Manager**: Built centralized connection management with user/session indexing
- **API Endpoint**: Created `/api/sse` route with proper SSE headers and stream handling
- **Client Hooks**: Implemented `useSSE`, `useSSEEvent`, and `useSSEEvents` React hooks
- **Backend Integration**: Added utility functions for easy event sending from other services
- **Demo UI**: Created interactive demo page at `/sse-demo` for testing

## Quick Start

### 1. Client-Side Usage

```tsx
import { useSSE, useSSEEvent } from "@/features/sse";

function MyComponent() {
  // Connect to SSE endpoint
  const sse = useSSE("/api/sse", {
    autoReconnect: true,
    debug: false,
  });

  // Listen for specific events
  useSSEEvent(
    "user_notification",
    (data) => {
      console.log("Received notification:", data);
    },
    sse,
  );

  return (
    <div>
      <p>Connection: {sse.connectionState}</p>
      <p>Events received: {sse.stats.eventCount}</p>
    </div>
  );
}
```

### 2. Backend Integration

```typescript
import { notifyUsers, broadcastNotification } from "@/features/sse";

// Notify specific users
await notifyUsers(
  "video_processed",
  {
    videoId: "123",
    status: "ready",
    thumbnailUrl: "https://...",
  },
  ["user1", "user2"],
);

// Broadcast to all users
await broadcastNotification("system_maintenance", {
  message: "System will be down for maintenance in 10 minutes",
  scheduledTime: "2024-01-01T10:00:00Z",
});
```

### 3. Webhook Integration

```typescript
import { webhookNotifier } from "@/features/sse";

// In your webhook handler
export async function POST(request: NextRequest) {
  const event = await request.json();

  // Automatically notify users about video processing
  await webhookNotifier.videoProcessed(
    event.data.video_id,
    event.type === "video.asset.ready" ? "ready" : "failed",
    event.data.user_id,
  );

  return Response.json({ received: true });
}
```

## API Reference

### Client-Side Hooks

#### `useSSE(url?, options?)`

Main hook for establishing SSE connection.

**Parameters:**

- `url` (string, optional): SSE endpoint URL (defaults to "/api/sse")
- `options` (SSEOptions, optional): Configuration options

**Returns:** `UseSSEReturn` object with connection state and controls

**Options:**

```typescript
interface SSEOptions {
  autoReconnect?: boolean; // Auto-reconnect on connection loss (default: true)
  reconnectDelay?: number; // Delay between reconnection attempts (default: 3000ms)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
  queryParams?: Record<string, string>; // Additional URL parameters
  debug?: boolean; // Enable debug logging (default: false)
}
```

#### `useSSEEvent(eventType, handler, sseHook?)`

Hook to listen for specific SSE events.

**Parameters:**

- `eventType` (string): Event type to listen for
- `handler` (function): Callback function when event is received
- `sseHook` (UseSSEReturn, optional): SSE hook instance (uses default if not provided)

#### `useSSEEvents(eventHandlers, sseHook?)`

Hook to listen for multiple SSE event types.

**Parameters:**

- `eventHandlers` (Record<string, function>): Object mapping event types to handlers
- `sseHook` (UseSSEReturn, optional): SSE hook instance

### Backend Integration Functions

#### `notifyUsers(event, data, userIds)`

Send notification to specific users.

```typescript
await notifyUsers(
  "order_shipped",
  {
    orderId: "123",
    trackingNumber: "ABC123",
    estimatedDelivery: "2024-01-15",
  },
  ["user123"],
);
```

#### `broadcastNotification(event, data, excludeUserIds?)`

Broadcast notification to all connected clients.

```typescript
await broadcastNotification("new_feature", {
  title: "New Chat Feature",
  description: "Try our new real-time chat!",
  buttonText: "Try Now",
});
```

#### `sendSystemAlert(message, severity?, metadata?)`

Send system-wide alerts.

```typescript
await sendSystemAlert("Scheduled maintenance starting soon", "warning", {
  maintenanceWindow: "30 minutes",
});
```

#### `sendResourceUpdate(resourceType, resourceId, action, data, targetUserIds?)`

Send resource-specific updates.

```typescript
await sendResourceUpdate(
  "document",
  "doc123",
  "updated",
  {
    lastModified: new Date().toISOString(),
    modifiedBy: "John Doe",
  },
  ["collaborator1", "collaborator2"],
);
```

#### `sendProgressUpdate(operationId, progress, message?, targetUserIds?)`

Send progress updates for long-running operations.

```typescript
await sendProgressUpdate("file-upload-123", 75, "Uploading file...", [
  "user123",
]);
```

### Connection Management

#### `getConnectionStats()`

Get current connection statistics.

```typescript
const stats = getConnectionStats();
console.log(`Total connections: ${stats.totalConnections}`);
console.log(`Connections by user:`, stats.connectionsByUser);
```

#### `disconnectUser(userId)`

Forcibly disconnect all connections for a specific user.

```typescript
await disconnectUser("user123"); // Useful for security/admin actions
```

## Event Types

The system supports these built-in event types:

### System Events

- `connected`: Sent when client successfully connects
- `heartbeat`: Periodic keepalive events (every 30 seconds)
- `system_alert`: System-wide alerts and announcements

### Application Events

- `user_notification`: User-specific notifications
- `resource_update`: Updates about specific resources (files, documents, etc.)
- `progress_update`: Progress updates for long-running operations
- `user_updated`: User profile/data changes

### Custom Events

You can send any custom event type using `sendCustomEvent()`.

## Configuration

### Server Configuration

The SSE manager can be configured with:

```typescript
const sseManager = new SSEManager({
  heartbeatInterval: 30000, // Heartbeat interval (30 seconds)
  connectionTimeout: 60000, // Connection timeout (60 seconds)
  maxConnectionsPerUser: 50, // Max connections per user (allows many tabs)
  enableLogging: true, // Enable detailed logging
});
```

### Client Configuration

```typescript
const sse = useSSE("/api/sse", {
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
  debug: process.env.NODE_ENV === "development",
});
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client        │    │   API Endpoint   │    │  SSE Manager    │
│                 │◄──►│  /api/sse        │◄──►│                 │
│  useSSE Hook    │    │                  │    │  Connection     │
│                 │    │  - Auth Check    │    │  Management     │
│  Event Handlers │    │  - Stream Setup  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Backend        │
                                                │  Integration    │
                                                │                 │
                                                │  - Webhooks     │
                                                │  - Job Queue    │
                                                │  - Other APIs   │
                                                └─────────────────┘
```

## Error Handling

The system includes comprehensive error handling:

### Client-Side

- Automatic reconnection on connection failures
- Exponential backoff for reconnection attempts
- Error state management and user feedback

### Server-Side

- Proper cleanup of failed connections
- Resource leak prevention
- Structured error logging

## Performance Considerations

- **Multi-Tab Support**: Supports many concurrent connections per user (default limit: 50)
- **Memory Management**: Automatic cleanup of stale connections
- **Heartbeat Optimization**: Configurable heartbeat intervals
- **Event Queuing**: No queuing - events are sent immediately or dropped

## Security

- **Authentication**: Integrates with NextAuth session management
- **Authorization**: User-based event targeting
- **Rate Limiting**: Built-in connection limits per user
- **CORS**: Configurable CORS headers

## Monitoring & Debugging

### Debug Mode

Enable debug logging for development:

```typescript
const sse = useSSE("/api/sse", { debug: true });
```

### Connection Stats

Monitor connection health:

```typescript
const stats = getConnectionStats();
console.log(stats); // Total connections, per-user breakdown, etc.
```

### Demo Page

Visit `/sse-demo` to test the SSE functionality with a visual interface.

## Troubleshooting

### Common Issues

1. **Connection Drops**: Check network stability and heartbeat settings
2. **No Events Received**: Verify event names and user targeting
3. **Memory Leaks**: Ensure proper component cleanup
4. **Authentication Issues**: Verify session management integration

### Debug Steps

1. Enable debug logging on both client and server
2. Check browser Network tab for SSE connection
3. Monitor server logs for connection events
4. Use the demo page to isolate issues

## Examples

See the `/api/sse/test` endpoint and `SSEDemo` component for complete working examples.

## License

This SSE implementation is part of the application codebase and follows the same licensing terms.
