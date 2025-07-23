# Server-Sent Events (SSE) Layer

A reusable, abstracted Server-Sent Events implementation for real-time server-to-client notifications.

## Features

- ✅ Centralized SSE connection management
- ✅ User and session-based connection tracking
- ✅ Named events with JSON payloads
- ✅ Heartbeat/ping mechanism for connection health
- ✅ Automatic cleanup and resource management
- ✅ Flexible event targeting (individual, user, session, broadcast)
- ✅ Error handling and logging
- ✅ TypeScript support

## Quick Start

### 1. Client-Side Connection

```tsx
import { useSSE } from "@/features/sse/hooks/useSSE";

function MyComponent() {
  const { isConnected, lastEvent, error } = useSSE();

  useEffect(() => {
    if (lastEvent?.type === "notification") {
      // Handle notification
      console.log("Received notification:", lastEvent.data);
    }
  }, [lastEvent]);

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastEvent && <p>Last event: {lastEvent.type}</p>}
    </div>
  );
}
```

### 2. Server-Side Event Sending

```typescript
import {
  sendNotification,
  sendDataUpdate,
} from "@/features/sse/utils/sse-utils";

// Send notification to specific user
await sendNotification("Your upload is complete!", {
  userId: "user123",
  title: "Upload Complete",
  type: "success",
});

// Send data update
await sendDataUpdate(
  "user_stats",
  {
    totalUsers: 1500,
    activeUsers: 234,
  },
  { broadcast: true },
);
```

## API Reference

### SSE Manager

The core `SSEManager` class handles all connection management:

```typescript
import { getSSEManager } from "@/features/sse";

const sseManager = getSSEManager();

// Add connection
sseManager.addConnection(connectionId, writer, userId, sessionId);

// Send event
await sseManager.sendEvent(
  {
    type: "custom_event",
    data: { message: "Hello!" },
  },
  { userId: "user123" },
);

// Get stats
const stats = sseManager.getStats();
```

### Utility Functions

#### `sendNotification(message, options)`

Send user-friendly notifications with optional actions.

```typescript
await sendNotification("New message received", {
  userId: "user123",
  title: "Message",
  type: "info",
  action: {
    label: "View Message",
    url: "/messages/123",
  },
});
```

#### `sendDataUpdate(dataType, data, options)`

Send real-time data updates.

```typescript
await sendDataUpdate(
  "chat_message",
  {
    id: "msg123",
    content: "Hello world!",
    sender: "john",
  },
  { sessionId: "session456" },
);
```

#### `sendProgressUpdate(operationId, progress, options)`

Send progress updates for long-running operations.

```typescript
await sendProgressUpdate(
  "upload_123",
  {
    percentage: 75,
    message: "Processing video...",
    stage: "encoding",
    estimatedTimeRemaining: 30000,
  },
  { userId: "user123" },
);
```

#### `broadcastEvent(eventType, payload)`

Broadcast to all connected clients.

```typescript
await broadcastEvent("system_maintenance", {
  message: "System will be down for maintenance in 10 minutes",
  scheduledTime: Date.now() + 600000,
});
```

### SSE Webhook Notifier

For webhook handlers and background jobs:

```typescript
import { SSEWebhookNotifier } from "@/features/sse";

const notifier = new SSEWebhookNotifier("user123");

// Notify webhook events
await notifier.notifyWebhookEvent("mux_video_ready", {
  assetId: "asset123",
  playbackId: "playback456",
});

// Notify processing completion
await notifier.notifyProcessingComplete("video_encoding", {
  videoId: "video123",
  status: "ready",
});
```

## Event Types

### Built-in Event Types

| Event Type        | Description            | Data Structure                                   |
| ----------------- | ---------------------- | ------------------------------------------------ |
| `connection`      | Connection established | `{ status: 'connected', connectionId }`          |
| `heartbeat`       | Keep-alive ping        | `{ timestamp: number }`                          |
| `notification`    | User notification      | `{ message, title?, type?, action?, timestamp }` |
| `data_update`     | Real-time data         | `{ dataType, payload, timestamp }`               |
| `progress_update` | Operation progress     | `{ operationId, progress, timestamp }`           |
| `system_status`   | System announcements   | `{ type, message, severity?, timestamp }`        |
| `user_activity`   | User-specific activity | `{ activityType, data, timestamp }`              |

### Custom Events

You can send any custom event type:

```typescript
await sendCustomEvent(
  "my_custom_event",
  {
    customData: "value",
    moreData: { nested: "object" },
  },
  { userId: "user123" },
);
```

## Configuration

### SSE Manager Configuration

```typescript
const sseManager = new SSEManager({
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 60000, // 60 seconds
  maxConnections: 1000, // Max concurrent connections
});
```

### useSSE Hook Options

```typescript
const { isConnected } = useSSE({
  reconnectInterval: 3000, // Reconnect delay
  maxReconnectAttempts: 5, // Max reconnection attempts
  connectionId: "custom-id", // Custom connection ID
});
```

## Integration Examples

### With Webhook Handlers

```typescript
// In your webhook handler (e.g., Mux webhook)
import { SSEWebhookNotifier } from "@/features/sse";

export async function POST(request: NextRequest) {
  const webhook = await request.json();

  if (webhook.type === "video.asset.ready") {
    const notifier = new SSEWebhookNotifier(webhook.data.userId);
    await notifier.notifyProcessingComplete("video_processing", {
      assetId: webhook.data.id,
      playbackUrl: webhook.data.playback_ids[0].id,
    });
  }

  return new Response("OK");
}
```

### With Background Jobs

```typescript
// In a background job or API route
import { sendProgressUpdate } from "@/features/sse";

async function processLargeFile(fileId: string, userId: string) {
  await sendProgressUpdate(
    fileId,
    {
      percentage: 0,
      message: "Starting processing...",
    },
    { userId },
  );

  // ... processing logic with periodic updates

  await sendProgressUpdate(
    fileId,
    {
      percentage: 100,
      message: "Processing complete!",
    },
    { userId },
  );
}
```

### With tRPC

```typescript
// In your tRPC router
import { sendNotification } from "@/features/sse";

export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Update user profile
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name },
      });

      // Send real-time notification
      await sendNotification("Profile updated successfully!", {
        userId: ctx.session.user.id,
        type: "success",
      });

      return updatedUser;
    }),
});
```

## Testing

Visit `/sse-demo` page to test the SSE functionality with a live interface.

## Best Practices

1. **Resource Management**: Always clean up connections properly
2. **Error Handling**: Handle connection failures gracefully with reconnection logic
3. **Rate Limiting**: Consider implementing rate limiting for event sending
4. **Logging**: Use structured logging for debugging connection issues
5. **Security**: Validate user permissions before sending sensitive data
6. **Performance**: Monitor connection counts and clean up stale connections

## Troubleshooting

### Common Issues

1. **Connection Not Establishing**
   - Check CORS headers
   - Verify SSE endpoint is accessible
   - Check browser developer tools for errors

2. **Events Not Received**
   - Verify connection is active
   - Check event formatting
   - Ensure proper JSON serialization

3. **Memory Leaks**
   - Ensure connections are properly cleaned up
   - Monitor connection count with `getStats()`
   - Check for orphaned event listeners

### Debug Information

```typescript
import { getConnectionStats } from "@/features/sse";

// Get current connection statistics
const stats = getConnectionStats();
console.log("SSE Stats:", stats);
```

## Performance Considerations

- Maximum of 1000 concurrent connections by default
- Heartbeat every 30 seconds to maintain connections
- Automatic cleanup of stale connections after 60 seconds
- Event data is JSON-serialized (keep payloads reasonable)

## Security

- Connections are tied to user sessions when available
- No sensitive data should be logged in event payloads
- Consider implementing additional authentication for sensitive events
- Rate limiting should be implemented at the application level
