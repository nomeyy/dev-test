# Server-Sent Events (SSE) System

A comprehensive, reusable Server-Sent Events layer for real-time, server-to-client notifications across the application.

## Features

- **Centralized SSE Manager**: Single instance managing all client connections
- **Client Connection Tracking**: Per-user and per-session connection management
- **Event Broadcasting**: Send events to specific clients, users, or broadcast to all
- **Automatic Heartbeat**: Keeps connections alive with periodic ping messages
- **Connection Cleanup**: Automatic cleanup of dead connections and resource management
- **Error Handling**: Robust error handling with logging and recovery
- **React Integration**: Hooks and components for easy client-side consumption
- **TypeScript Support**: Full type safety throughout the system

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App   │◄───┤   SSE Manager    │◄───┤  Backend APIs   │
│                │    │                  │    │                 │
│ - useSSE Hook  │    │ - Connection     │    │ - Notification  │
│ - Components   │    │   Management     │    │   Service       │
│                │    │ - Event Routing  │    │ - Webhooks      │
└─────────────────┘    │ - Heartbeat     │    │ - Job Processors│
                       │ - Cleanup       │    └─────────────────┘
                       └──────────────────┘
```

## Quick Start

### 1. Client-Side Usage

```tsx
import { useSSE } from '@/features/sse';

function MyComponent() {
  const { isConnected, lastEvent, error } = useSSE({
    onMessage: (event) => {
      console.log('Received SSE event:', event);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {lastEvent && (
        <p>Last event: {lastEvent.event} - {JSON.stringify(lastEvent.data)}</p>
      )}
    </div>
  );
}
```

### 2. Server-Side Usage

```typescript
import { sseNotificationService } from '@/features/sse';

// Send to specific user
sseNotificationService.sendUserNotification(
  'user123',
  'order_update',
  { orderId: '456', status: 'shipped' }
);

// Broadcast to all clients
sseNotificationService.broadcast('system_maintenance', {
  message: 'Scheduled maintenance in 5 minutes',
  priority: 'high'
});
```

## API Reference

### Core SSE Manager

#### `SSEManager`

The main class that manages all SSE connections and events.

```typescript
import { SSEManager } from '@/features/sse';

const manager = new SSEManager({
  heartbeatInterval: 30000,    // 30 seconds
  maxConnections: 1000,        // Max concurrent connections
  connectionTimeout: 300000,   // 5 minutes
  cleanupInterval: 60000,      // 1 minute
});
```

#### `getSSEManager()`

Get or create the global SSE manager instance.

```typescript
import { getSSEManager } from '@/features/sse';

const manager = getSSEManager();
```

### Notification Service

#### `sseNotificationService`

High-level service for sending notifications without managing SSE protocol details.

```typescript
import { sseNotificationService } from '@/features/sse';

// Send to specific users
sseNotificationService.notifyUsers(
  ['user1', 'user2'],
  'message_received',
  { sender: 'john', content: 'Hello!' }
);

// Send to specific sessions
sseNotificationService.notifySessions(
  ['session1', 'session2'],
  'status_update',
  { status: 'online' }
);

// Broadcast to all clients
sseNotificationService.broadcast('announcement', {
  title: 'Important Update',
  message: 'New features available!'
});
```

### React Hooks

#### `useSSE(options?)`

Main hook for establishing SSE connections and receiving all events.

```typescript
const {
  isConnected,
  isConnecting,
  error,
  lastEvent,
  connect,
  disconnect,
  reconnect
} = useSSE({
  url: '/api/sse',
  withCredentials: true,
  onMessage: (event) => console.log(event),
  onError: (error) => console.error(error),
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 5000
});
```

#### `useSSEEvent(eventType, options?)`

Hook for filtering events by specific type.

```typescript
const {
  events,
  lastEvent,
  clearEvents
} = useSSEEvent('user_notification', {
  onMessage: (event) => console.log('User notification:', event)
});
```

#### Specialized Hooks

```typescript
// Pre-configured hooks for common event types
const heartbeat = useSSEHeartbeat();
const systemNotifications = useSSESystemNotification();
const errorNotifications = useSSEErrorNotification();
const successNotifications = useSSESuccessNotification();
const connectionEvents = useSSEConnection();
```

### React Components

#### `SSEConnectionStatus`

Displays connection status with manual connect/disconnect controls.

```tsx
import { SSEConnectionStatus } from '@/features/sse';

<SSEConnectionStatus
  showReconnectButton={true}
  showConnectionInfo={true}
  className="my-4"
/>
```

#### `SSEEventDisplay`

Displays SSE events with filtering and search capabilities.

```tsx
import { SSEEventDisplay } from '@/features/sse';

<SSEEventDisplay
  maxEvents={100}
  showEventType={true}
  showTimestamp={true}
  showData={true}
  filterEventTypes={['user_notification', 'system']}
/>
```

## Integration Examples

### 1. Webhook Integration

```typescript
// In your webhook handler
import { sseNotificationService } from '@/features/sse';

export async function POST(request: Request) {
  const webhookData = await request.json();
  
  // Notify relevant users about the webhook
  if (webhookData.userId) {
    sseNotificationService.sendUserNotification(
      webhookData.userId,
      'webhook_received',
      webhookData
    );
  }
  
  return Response.json({ success: true });
}
```

### 2. Background Job Integration

```typescript
// In your job processor
import { sseNotificationService } from '@/features/sse';

async function processOrder(orderId: string) {
  try {
    // Process the order...
    await processOrderJob(orderId);
    
    // Notify user about completion
    sseNotificationService.sendUserNotification(
      order.userId,
      'order_processed',
      { orderId, status: 'completed' }
    );
  } catch (error) {
    // Notify about failure
    sseNotificationService.sendUserNotification(
      order.userId,
      'order_failed',
      { orderId, error: error.message }
    );
  }
}
```

### 3. Real-time Chat

```typescript
// Send message to specific users
function sendChatMessage(senderId: string, recipientIds: string[], message: string) {
  sseNotificationService.notifyUsers(
    recipientIds,
    'chat_message',
    {
      senderId,
      message,
      timestamp: new Date().toISOString()
    }
  );
}
```

### 4. Live Updates

```typescript
// Update user's dashboard in real-time
function updateUserDashboard(userId: string, updates: any) {
  sseNotificationService.sendUserNotification(
    userId,
    'dashboard_update',
    updates
  );
}
```

## Configuration

### Environment Variables

```env
# SSE Configuration (optional, defaults shown)
SSE_HEARTBEAT_INTERVAL=30000
SSE_MAX_CONNECTIONS=1000
SSE_CONNECTION_TIMEOUT=300000
SSE_CLEANUP_INTERVAL=60000
```

### Custom Configuration

```typescript
import { getSSEManager } from '@/features/sse';

const manager = getSSEManager({
  heartbeatInterval: 15000,    // 15 seconds
  maxConnections: 500,         // Lower limit for development
  connectionTimeout: 600000,   // 10 minutes
  cleanupInterval: 30000,      // 30 seconds
});
```

## Error Handling

The SSE system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Event Parsing Errors**: Graceful fallback for malformed events
- **Resource Cleanup**: Automatic cleanup of dead connections
- **Logging**: Detailed logging for debugging and monitoring

## Performance Considerations

- **Connection Limits**: Configurable maximum concurrent connections
- **Event Batching**: Events are sent immediately (consider batching for high-frequency updates)
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Scalability**: Designed to handle hundreds of concurrent connections

## Security

- **Authentication**: Integrates with your existing auth system
- **User Isolation**: Events are only sent to authorized users
- **Rate Limiting**: Consider implementing rate limiting for event sending
- **Input Validation**: Validate all event data before sending

## Monitoring and Metrics

```typescript
import { sseNotificationService } from '@/features/sse';

// Get connection statistics
const stats = sseNotificationService.getConnectionStats();
console.log('Active connections:', stats.activeConnections);
console.log('Total events sent:', stats.totalEventsSent);

// Check user connection status
const isUserOnline = sseNotificationService.isUserConnected('user123');
```

## Troubleshooting

### Common Issues

1. **Connections not establishing**
   - Check CORS configuration
   - Verify authentication setup
   - Check network connectivity

2. **Events not received**
   - Verify event names match between sender and receiver
   - Check client connection status
   - Verify event data format

3. **Memory leaks**
   - Ensure proper cleanup in components
   - Check for connection leaks in long-running processes

### Debug Mode

Enable debug logging by setting the log level:

```typescript
// In your app configuration
process.env.LOG_LEVEL = 'debug';
```

## Best Practices

1. **Event Naming**: Use consistent, descriptive event names
2. **Data Structure**: Keep event data lightweight and structured
3. **Error Handling**: Always handle connection errors gracefully
4. **Resource Management**: Clean up connections when components unmount
5. **Testing**: Test SSE functionality in your test suite

## Testing

The SSE system includes comprehensive testing support:

```typescript
import { renderHook } from '@testing-library/react';
import { useSSE } from '@/features/sse';

test('useSSE establishes connection', () => {
  const { result } = renderHook(() => useSSE());
  
  expect(result.current.isConnected).toBe(true);
});
```

## Contributing

When contributing to the SSE system:

1. Maintain backward compatibility
2. Add comprehensive tests
3. Update documentation
4. Follow the existing code style
5. Consider performance implications

## License

This SSE system is part of the main project and follows the same licensing terms.
