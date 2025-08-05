# Server-Sent Events (SSE) Feature

A comprehensive, reusable SSE implementation for real-time server-to-client notifications in Next.js applications.

## Features

- 🔄 **Connection Management**: Automatic connection tracking, heartbeat, and cleanup
- 👥 **User-based Targeting**: Send events to specific users or broadcast to all
- 📡 **Event Types**: Built-in support for notifications, messages, and custom events
- 🔌 **Auto-reconnection**: Client-side automatic reconnection with exponential backoff
- 🛡️ **Error Handling**: Comprehensive error handling and logging
- ⚡ **Performance**: Efficient connection pooling and resource management
- 🔒 **Authentication**: Integration with NextAuth for user-based messaging

## Quick Start

### 1. Client-side Usage (React)

```tsx
import { useSSE, useSSENotifications } from "@/features/sse";

function MyComponent() {
  // Basic SSE connection
  const sse = useSSE({ autoConnect: true });

  // Specialized hook for notifications
  const { notifications, clearNotifications } = useSSENotifications();

  // Listen to custom events
  useEffect(() => {
    const handleCustomEvent = (event) => {
      console.log("Custom event received:", event.data);
    };

    sse.addEventListener("custom", handleCustomEvent);
    return () => sse.removeEventListener("custom", handleCustomEvent);
  }, [sse]);

  return (
    <div>
      <p>Connection Status: {sse.isConnected ? "Connected" : "Disconnected"}</p>
      <div>
        {notifications.map((notification, index) => (
          <div key={index}>
            {notification.title}: {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Server-side Usage

```tsx
import {
  notifyUser,
  broadcastNotification,
  sendCustomEvent,
} from "@/features/sse";

// Send notification to specific user
await notifyUser("user123", {
  title: "New Message",
  message: "You have a new message!",
  type: "info",
});

// Broadcast to all connected clients
await broadcastNotification({
  title: "System Update",
  message: "The system will be updated in 5 minutes",
  type: "warning",
});

// Send custom event with filtering
await sendCustomEvent(
  "data-update",
  {
    resource: "posts",
    data: { id: 123, title: "New Post" },
  },
  { userIds: ["user1", "user2"] },
);
```

## API Reference

### Client-Side Hooks

#### `useSSE(options?)`

Main hook for SSE connections.

**Options:**

- `url?: string` - SSE endpoint URL (default: '/api/sse')
- `autoConnect?: boolean` - Auto-connect on mount (default: true)
- `autoReconnect?: boolean` - Enable auto-reconnection (default: true)
- `reconnectDelay?: number` - Initial reconnection delay in ms (default: 1000)
- `maxReconnectAttempts?: number` - Max reconnection attempts (default: 5)

**Returns:**

- `isConnected: boolean` - Connection status
- `connect(): void` - Manual connect function
- `disconnect(): void` - Manual disconnect function
- `lastEvent: SSEEvent | null` - Last received event
- `error: Event | null` - Connection error
- `addEventListener(type, handler)` - Add event listener
- `removeEventListener(type, handler)` - Remove event listener

#### `useSSENotifications(options?)`

Specialized hook for notifications.

**Returns:** All `useSSE` returns plus:

- `notifications: NotificationPayload[]` - Array of notifications
- `clearNotifications(): void` - Clear all notifications
- `removeNotification(index): void` - Remove specific notification

#### `useSSEMessages(options?)`

Specialized hook for messages.

**Returns:** All `useSSE` returns plus:

- `messages: MessagePayload[]` - Array of messages
- `clearMessages(): void` - Clear all messages

### Server-Side Functions

#### Notification Functions

```tsx
// Send to specific user
await notifyUser(userId: string, notification: NotificationPayload): Promise<number>

// Send to multiple users
await notifyUsers(userIds: string[], notification: NotificationPayload): Promise<number>

// Broadcast to all
await broadcastNotification(notification: NotificationPayload): Promise<number>
```

#### Message Functions

```tsx
// Send message to user
await messageUser(userId: string, message: MessagePayload): Promise<number>

// Broadcast message
await broadcastMessage(message: MessagePayload): Promise<number>
```

#### Custom Events

```tsx
// Send custom event
await sendCustomEvent<T>(
  eventType: string,
  data: T,
  filter?: EventFilter,
  options?: { id?: string; retry?: number }
): Promise<number>
```

#### Helper Functions

```tsx
// Connection management
getConnectionStats(): { totalConnections: number; getUserConnections(userId): number }
disconnectUser(userId: string): number
disconnectConnection(connectionId: string): boolean

// Convenience helpers
SSEHelpers.notifySuccess(userId: string, title: string, message: string)
SSEHelpers.notifyError(userId: string, title: string, message: string)
SSEHelpers.notifyWarning(userId: string, title: string, message: string)
SSEHelpers.systemBroadcast(message: string)
```

## Type Definitions

### Core Types

```tsx
interface SSEEvent<T = unknown> {
  type: string;
  data: T;
  id?: string;
  retry?: number;
}

interface NotificationPayload {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp?: string;
  actions?: Array<{ label: string; action: string }>;
}

interface MessagePayload {
  from: string;
  content: string;
  timestamp: string;
  type?: "text" | "system";
}

interface EventFilter {
  userIds?: string[];
  sessionIds?: string[];
  connectionIds?: string[];
  excludeUserIds?: string[];
  excludeSessionIds?: string[];
  excludeConnectionIds?: string[];
}
```

### Predefined Event Types

```tsx
const SSEEventTypes = {
  PING: "ping",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  NOTIFICATION: "notification",
  MESSAGE: "message",
  UPDATE: "update",
  CUSTOM: "custom",
} as const;
```

## Integration Examples

### Webhook Integration

```tsx
// In your webhook handler
import { notifyUsers, broadcastUpdate } from "@/features/sse";

export async function POST(request: NextRequest) {
  const webhookData = await request.json();

  // Notify specific users about the webhook event
  if (webhookData.userIds) {
    await notifyUsers(webhookData.userIds, {
      title: "Webhook Event",
      message: `${webhookData.type} event received`,
      type: "info",
    });
  }

  // Broadcast data update
  await broadcastUpdate({
    resource: webhookData.resource,
    action: "updated",
    data: webhookData.data,
    timestamp: new Date().toISOString(),
  });
}
```

### tRPC Integration

```tsx
// In your tRPC procedure
import { notifyUser } from "@/features/sse";

export const updateProfile = publicProcedure
  .input(z.object({ userId: z.string(), data: z.object({}) }))
  .mutation(async ({ input }) => {
    // Update user profile...

    // Notify user of successful update
    await notifyUser(input.userId, {
      title: "Profile Updated",
      message: "Your profile has been successfully updated!",
      type: "success",
    });

    return { success: true };
  });
```

### Middleware Integration

```tsx
// Custom middleware for SSE events
import { sendCustomEvent } from "@/features/sse";

export async function middleware(request: NextRequest) {
  // Track page views in real-time
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const userId = getUserIdFromRequest(request);

    await sendCustomEvent(
      "page-view",
      {
        page: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get("user-agent"),
      },
      { userIds: [userId] },
    );
  }

  return NextResponse.next();
}
```

## Configuration

### Environment Variables

```env
# Optional: Enable SSE debug logging
SSE_DEBUG=true

# Optional: Custom heartbeat interval (ms)
SSE_HEARTBEAT_INTERVAL=30000

# Optional: Connection timeout (ms)
SSE_CONNECTION_TIMEOUT=300000

# Optional: Max connections per user
SSE_MAX_CONNECTIONS_PER_USER=5
```

### Manager Configuration

```tsx
import { getSSEManager } from "@/features/sse";

// Get manager with custom config
const sseManager = getSSEManager({
  heartbeatInterval: 30000,
  connectionTimeout: 300000,
  maxConnectionsPerUser: 5,
  debug: process.env.NODE_ENV === "development",
});
```

## Testing

Visit `/sse-demo` to test the SSE functionality with the built-in test panel.

The test panel allows you to:

- Connect/disconnect manually
- Send different types of test events
- View real-time event logs
- Monitor connection status
- Test different event types (notifications, messages, custom)

## Performance Considerations

1. **Connection Limits**: Default max 5 connections per user
2. **Heartbeat**: 30-second intervals keep connections alive
3. **Cleanup**: Automatic cleanup of stale connections (5-minute timeout)
4. **Memory Management**: Efficient Map-based connection tracking
5. **Error Handling**: Graceful handling of connection errors and reconnection

## Browser Support

- Modern browsers with EventSource support
- Automatic fallback and reconnection for network issues
- CORS properly configured for cross-origin requests

## Security

- Integration with NextAuth for user authentication
- User-based connection tracking and authorization
- Secure event filtering and targeting
- Protection against connection abuse with per-user limits

## Troubleshooting

### Connection Issues

1. Check browser network tab for SSE endpoint accessibility
2. Verify CORS headers are properly set
3. Ensure authentication is working if user-specific events are not received

### Performance Issues

1. Monitor connection count with `getConnectionStats()`
2. Adjust heartbeat interval for your needs
3. Consider implementing client-side event batching for high-frequency events

### Missing Events

1. Verify event type names match exactly
2. Check user authentication for user-specific events
3. Ensure proper event filtering is applied
