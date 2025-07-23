# Server-Sent Events (SSE) Feature

A comprehensive, reusable SSE layer that enables real-time, server-to-client notifications across the application.

## Overview

This SSE implementation provides:

- **Centralized SSE Manager**: Tracks active client connections and handles event dispatching
- **Clean API**: Backend modules can send notifications without managing SSE protocol details
- **Automatic Reconnection**: Client-side automatic reconnection with configurable retry logic
- **Heartbeat Support**: Keeps connections alive with periodic heartbeat messages
- **Redis Integration**: Optional Redis pub/sub for distributed deployments
- **React Hooks**: Easy-to-use React hooks for client-side SSE consumption
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │   SSE Manager    │    │  Backend Code   │
│                 │    │                  │    │                 │
│  useSSE Hook    │◄──►│  Connection Pool │◄──►│ SSE Actions     │
│  SSEMessageDisplay│   │  Event Router    │    │ Webhooks        │
│                 │    │  Heartbeat       │    │ Background Jobs │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Redis (Optional)│
                       │   Pub/Sub        │
                       └──────────────────┘
```

## Features

### ✅ Core Functionality

- [x] SSE endpoint (`/api/sse`) for client connections
- [x] Client connection lifecycle management
- [x] Event dispatching to individual users, sessions, or all clients
- [x] Automatic heartbeat/ping mechanism
- [x] Connection cleanup and resource management
- [x] Error handling and logging

### ✅ Backend Integration

- [x] Clean notification service API
- [x] Server actions for sending events
- [x] Support for different event types (notifications, status updates, etc.)
- [x] Redis integration for distributed deployments
- [x] Connection statistics and monitoring

### ✅ Client-Side Features

- [x] React hook (`useSSE`) for easy integration
- [x] Automatic reconnection with exponential backoff
- [x] Event history and display components
- [x] Connection status monitoring
- [x] Type-safe event handling

## Quick Start

### 1. Server-Side Usage

```typescript
import { sseNotifications } from "@/features/sse";

// Send notification to specific user
await sseNotifications.notifyUser("user-id", "notification", {
  title: "New Message",
  message: "You have a new message",
  type: "info",
});

// Send system alert to all users
await sseNotifications.sendSystemAlert(
  "Maintenance Notice",
  "System will be down for maintenance",
  "warning",
);

// Send status update
await sseNotifications.sendStatusUpdate("user-id", "processing", {
  progress: 50,
  stage: "uploading",
});
```

### 2. Client-Side Usage

```typescript
import { useSSE, SSEMessageDisplay } from '@/features/sse';

function MyComponent() {
  const { isConnected, lastEvent, error } = useSSE('/api/sse', {
    onMessage: (event) => {
      console.log('Received SSE event:', event);
    }
  });

  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      {lastEvent && (
        <p>Last event: {lastEvent.event}</p>
      )}

      {/* Or use the pre-built component */}
      <SSEMessageDisplay />
    </div>
  );
}
```

## API Reference

### SSE Manager

The core SSE manager handles all client connections and event routing.

```typescript
import { getSSEManager } from "@/features/sse";

const manager = getSSEManager({
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  enableRedis: true,
  redisChannel: "sse-events",
});
```

### Notification Service

High-level API for sending notifications from backend code.

```typescript
import { sseNotifications } from "@/features/sse";

// Send to specific user
await sseNotifications.notifyUser(userId, event, data, options);

// Send to specific session
await sseNotifications.notifySession(sessionId, event, data, options);

// Send to specific client
await sseNotifications.notifyClient(clientId, event, data, options);

// Broadcast to all clients
await sseNotifications.broadcast(event, data, options);

// Pre-built notification types
await sseNotifications.sendSystemAlert(title, message, level);
await sseNotifications.sendStatusUpdate(userId, status, details);
await sseNotifications.sendDataSync(userId, entity, action, entityId, data);
```

### React Hook

```typescript
import { useSSE } from "@/features/sse";

const {
  isConnected,
  isConnecting,
  error,
  lastEvent,
  reconnectAttempts,
  connect,
  disconnect,
  sendMessage,
} = useSSE("/api/sse", {
  onConnect: () => console.log("Connected"),
  onDisconnect: () => console.log("Disconnected"),
  onError: (error) => console.error("Error:", error),
  onMessage: (event) => console.log("Message:", event),
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
});
```

### React Component

```typescript
import { SSEMessageDisplay } from '@/features/sse';

<SSEMessageDisplay
  url="/api/sse"
  showConnectionStatus={true}
  showEventHistory={true}
  maxHistoryItems={20}
/>
```

## Configuration

### SSE Manager Configuration

```typescript
interface SSEManagerConfig {
  heartbeatInterval?: number; // Heartbeat interval in ms (default: 30000)
  maxConnections?: number; // Max concurrent connections (default: 1000)
  connectionTimeout?: number; // Connection timeout in ms (default: 300000)
  enableRedis?: boolean; // Enable Redis integration (default: false)
  redisChannel?: string; // Redis channel name (default: 'sse-events')
}
```

### Connection Options

```typescript
interface SSEConnectionOptions {
  userId?: string; // User ID for targeted notifications
  sessionId?: string; // Session ID for session-based notifications
  metadata?: Record<string, any>; // Additional connection metadata
  heartbeatInterval?: number; // Client-specific heartbeat interval
  maxReconnectTime?: number; // Max reconnection time
}
```

## Event Types

The SSE system supports various event types:

- `notification` - General notifications
- `status_update` - Status/progress updates
- `data_sync` - Data synchronization events
- `system_alert` - System-wide alerts
- `user_activity` - User activity events
- `heartbeat` - Connection keep-alive
- `custom` - Custom events

## Error Handling

The SSE system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Message Parsing Errors**: Graceful handling of malformed messages
- **Server Errors**: Proper cleanup and resource management
- **Redis Errors**: Fallback to in-memory when Redis is unavailable

## Monitoring and Statistics

```typescript
// Get connection statistics
const stats = sseNotifications.getStats();
console.log(stats);
// {
//   totalConnections: 10,
//   activeConnections: 8,
//   connectionsByUser: { 'user1': 2, 'user2': 1 },
//   lastActivity: 1640995200000
// }

// Check user connections
const hasConnections = sseNotifications.hasUserConnections("user-id");
const clientIds = sseNotifications.getUserClientIds("user-id");
```

## Testing

Visit `/sse-test` to see the SSE functionality in action. The test page includes:

- Real-time SSE connection display
- Test buttons for sending events
- Event history viewer
- Usage examples and documentation

## Best Practices

### Server-Side

1. **Use the notification service** instead of directly accessing the manager
2. **Handle errors gracefully** when sending notifications
3. **Use appropriate event types** for different kinds of messages
4. **Consider message priority** for important notifications
5. **Monitor connection statistics** in production

### Client-Side

1. **Use the `useSSE` hook** for automatic connection management
2. **Handle reconnection** with appropriate user feedback
3. **Parse event data safely** with proper error handling
4. **Clean up connections** when components unmount
5. **Use the `SSEMessageDisplay` component** for quick prototyping

### Performance

1. **Limit event history** to prevent memory issues
2. **Use targeted notifications** instead of broadcasting when possible
3. **Monitor connection limits** in high-traffic scenarios
4. **Enable Redis** for distributed deployments
5. **Implement proper cleanup** for inactive connections

## Troubleshooting

### Common Issues

1. **Connection not establishing**
   - Check if the SSE endpoint is accessible
   - Verify authentication is working
   - Check browser console for errors

2. **Events not received**
   - Verify the user ID matches between sender and receiver
   - Check if the client is connected
   - Monitor server logs for errors

3. **Memory leaks**
   - Ensure connections are properly cleaned up
   - Monitor connection statistics
   - Check for proper component unmounting

### Debug Mode

Enable debug logging by setting the log level:

```typescript
// In your logging configuration
logger.setLevel("debug");
```

## Security Considerations

1. **Authentication**: The SSE endpoint requires authentication
2. **User Isolation**: Users can only receive their own notifications
3. **Rate Limiting**: Consider implementing rate limiting for SSE connections
4. **Input Validation**: Validate all event data before sending
5. **HTTPS**: Use HTTPS in production for secure connections

## Future Enhancements

- [ ] WebSocket fallback for better browser support
- [ ] Message queuing for offline users
- [ ] Advanced filtering and subscription management
- [ ] Performance metrics and monitoring dashboard
- [ ] Message encryption for sensitive data
