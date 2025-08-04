# Server-Sent Events (SSE) Feature

A comprehensive, reusable Server-Sent Events implementation for real-time, server-to-client notifications.

## Features

- ✅ Centralized SSE connection management
- ✅ Named events with JSON payloads
- ✅ Client filtering (by user, session, metadata)
- ✅ Heartbeat/ping mechanism for connection health
- ✅ Automatic cleanup of stale connections
- ✅ React hook for easy frontend integration
- ✅ Utility functions for common backend patterns
- ✅ Comprehensive error handling and logging
- ✅ TypeScript support with full type safety

## Quick Start

### 1. Backend Usage

#### Basic Notifications

```typescript
import { broadcast, notifyUser, systemNotification } from "@/features/sse";

// Broadcast to all connected clients
broadcast({
  event: "announcement",
  data: { message: "New feature released!" },
});

// Send to specific user
notifyUser("user123", {
  event: "notification",
  data: { title: "Welcome!", message: "Thanks for joining!" },
});

// System notification
systemNotification("Maintenance scheduled for 2 AM", "warning");
```

#### Integration Utilities

```typescript
import {
  notifyJobCompletion,
  updateOperationProgress,
  notifyDataChange,
} from "@/features/sse";

// Job completion
await notifyJobCompletion("job_123", "user_456", "success", {
  result: "File processed successfully",
});

// Progress updates
await updateOperationProgress("upload_789", "user_456", 75, "Processing...");

// Data changes
await notifyDataChange("post", "post_123", "updated", postData, ["user_456"]);
```

### 2. Frontend Usage

#### React Hook

```tsx
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { isConnected, lastEvent, addEventListener } = useSSE({
    userId: "user123",
    metadata: { page: "dashboard" },
  });

  useEffect(() => {
    const unsubscribe = addEventListener("notification", (event) => {
      console.log("Received notification:", event.data);
      // Handle notification
    });

    return unsubscribe;
  }, [addEventListener]);

  return (
    <div>
      <p>Connection: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastEvent && <div>Latest: {JSON.stringify(lastEvent.data)}</div>}
    </div>
  );
}
```

#### Manual EventSource

```javascript
const eventSource = new EventSource("/api/sse?userId=user123");

eventSource.addEventListener("notification", (event) => {
  const data = JSON.parse(event.data);
  console.log("Notification:", data);
});

eventSource.onerror = (error) => {
  console.error("SSE Error:", error);
};
```

## API Reference

### Core Classes

#### `SSEManager`

The main class that manages SSE connections and event dispatching.

```typescript
const manager = new SSEManager({
  pingInterval: 30000, // 30 seconds
  clientTimeout: 60000, // 60 seconds
  maxClients: 1000, // Maximum connections
  enableLogging: true, // Enable detailed logging
});
```

**Methods:**

- `createConnection(options)` - Create new SSE connection
- `sendToClient(clientId, event)` - Send to specific client
- `sendToClients(filter, event)` - Send to filtered clients
- `broadcast(event)` - Send to all clients
- `sendToUser(userId, event)` - Send to user's clients
- `disconnectClient(clientId)` - Disconnect specific client
- `getStats()` - Get connection statistics
- `destroy()` - Cleanup and close all connections

### Utility Functions

#### Notifications

```typescript
// Basic notifications
broadcast(event: SSEEvent): number
notifyUser(userId: string, event: SSEEvent): number
notifyUsers(userIds: string[], event: SSEEvent): number
systemNotification(message: string, level?: "info" | "warning" | "error"): number

// Specialized notifications
realtimeUpdate(type: string, data: unknown, targetUsers?: string[]): number
progressUpdate(operationId: string, progress: number, message?: string, userId?: string): number
successNotification(message: string, data?: unknown, userId?: string): number
errorNotification(error: string, context?: Record<string, unknown>, userId?: string): number
```

#### Integration Helpers

```typescript
// Job/Task notifications
notifyJobCompletion(jobId: string, userId: string, result: "success" | "error", details?: Record<string, unknown>): Promise<void>
updateOperationProgress(operationId: string, userId: string, progress: number, message?: string, metadata?: Record<string, unknown>): Promise<void>

// System announcements
announceSystemUpdate(title: string, message: string, severity?: "info" | "warning" | "critical", targetUsers?: string[]): Promise<number>

// Data change notifications
notifyDataChange(entityType: string, entityId: string, changeType: "created" | "updated" | "deleted", data: unknown, affectedUsers?: string[]): Promise<number>

// Messaging
notifyNewMessage(conversationId: string, senderId: string, recipientIds: string[], messagePreview: string, metadata?: Record<string, unknown>): Promise<number>

// User activity
notifyUserActivity(userId: string, activity: "online" | "offline" | "typing" | "idle", contextUsers?: string[], metadata?: Record<string, unknown>): Promise<number>

// Metrics/Analytics
notifyMetricsUpdate(metricType: string, value: number | string, change?: number, targetUsers?: string[]): Promise<number>
```

### React Hook

#### `useSSE(options)`

```typescript
interface SSEHookOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface SSEHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: SSEEvent | null;
  error: string | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (
    eventType: string,
    handler: (event: SSEEvent) => void,
  ) => () => void;
}
```

## Event Types

### Standard Events

- `connected` - Client connection established
- `ping` - Heartbeat/keepalive
- `system` - System-wide notifications
- `notification` - User notifications
- `update` - Real-time data updates
- `progress` - Progress updates
- `success` - Success notifications
- `error` - Error notifications

### Custom Events

You can send any custom event type:

```typescript
broadcast({
  event: "custom_event",
  data: {
    /* your data */
  },
});
```

## API Endpoints

### `GET /api/sse`

Establishes SSE connection.

**Query Parameters:**

- `userId` (optional) - User identifier
- `sessionId` (optional) - Session identifier
- Any other parameters become metadata

### `GET /api/sse/stats`

Returns connection statistics.

**Response:**

```json
{
  "totalClients": 42,
  "clientsByUser": { "user123": 2 },
  "averageConnectionDuration": 150000,
  "totalEventsSent": 1337,
  "lastEventTime": 1641234567890
}
```

### `POST /api/sse/demo`

Demo endpoint for testing notifications.

**Body:**

```json
{
  "type": "broadcast|user|system|update|progress|success|error",
  "userId": "user123",
  "message": "Test message",
  "data": {
    /* optional data */
  }
}
```

## Configuration

### Environment Variables

The SSE feature uses the existing logging configuration. No additional environment variables are required.

### Manager Configuration

```typescript
import { initializeSSE } from "@/features/sse";

initializeSSE({
  pingInterval: 30000, // Heartbeat interval (ms)
  clientTimeout: 60000, // Client timeout (ms)
  maxClients: 1000, // Max concurrent connections
  enableLogging: true, // Enable detailed logging
});
```

## Integration Examples

### Webhook Integration

```typescript
// In your webhook handler
import { notifyUser, realtimeUpdate } from "@/features/sse";

export async function POST(request: NextRequest) {
  const { eventType, userId, data } = await request.json();

  switch (eventType) {
    case "user.profile.updated":
      notifyUser(userId, {
        event: "profile_updated",
        data: { message: "Profile updated", changes: data.changes },
      });
      break;

    case "content.published":
      realtimeUpdate("content", data, data.subscriberIds);
      break;
  }

  return new Response("OK");
}
```

### TRPC Integration

```typescript
// In your TRPC router
import { notifyUser } from "@/features/sse";

export const userRouter = router({
  updateProfile: privateProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await updateUserProfile(ctx.user.id, input);

      // Send real-time notification
      notifyUser(ctx.user.id, {
        event: "profile_updated",
        data: { message: "Profile updated successfully" },
      });

      return updatedUser;
    }),
});
```

### Job Queue Integration

```typescript
// In your job processor
import { updateOperationProgress, notifyJobCompletion } from "@/features/sse";

async function processUpload(jobData: UploadJob) {
  const { userId, fileId } = jobData;

  // Send progress updates
  for (let i = 0; i <= 100; i += 10) {
    await updateOperationProgress(fileId, userId, i, `Processing... ${i}%`);
    await processChunk(i);
  }

  // Send completion notification
  await notifyJobCompletion(fileId, userId, "success", {
    fileUrl: "/uploads/processed-file.jpg",
  });
}
```

## Error Handling

The SSE system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Send Errors**: Failed sends automatically disconnect stale clients
- **Resource Leaks**: Automatic cleanup of disconnected clients
- **Logging**: Detailed logging for debugging and monitoring

## Performance Considerations

- **Memory Usage**: Each client connection uses minimal memory (~1KB)
- **CPU Usage**: Heartbeat messages are lightweight JSON
- **Network**: SSE uses HTTP/1.1 keep-alive connections
- **Scaling**: Single instance supports 1000+ concurrent connections
- **Cleanup**: Automatic cleanup prevents resource leaks

## Testing

Use the demo page at `/sse-demo` to test SSE functionality:

1. Open multiple browser tabs to the demo page
2. Send different types of notifications
3. Observe real-time message delivery
4. Test connection handling by closing/reopening tabs

## Troubleshooting

### Connection Issues

1. Check browser dev tools Network tab for SSE connection
2. Verify `/api/sse` endpoint is accessible
3. Check server logs for connection errors

### Missing Events

1. Verify event listeners are properly registered
2. Check if client ID is valid and connected
3. Review server logs for send failures

### Performance Issues

1. Monitor connection count via `/api/sse/stats`
2. Check for memory leaks in disconnected clients
3. Verify heartbeat intervals are appropriate

### Browser Compatibility

SSE is supported in all modern browsers. For IE support, consider:

- Using polyfills like `eventsource-polyfill`
- Fallback to WebSocket or polling

## Security Considerations

- **Authentication**: Add auth middleware to SSE endpoints
- **Rate Limiting**: Implement connection limits per user/IP
- **Data Validation**: Validate all event data before sending
- **CORS**: Configure appropriate CORS headers
- **Encryption**: Use HTTPS for production deployments

## Best Practices

1. **Event Naming**: Use consistent, descriptive event names
2. **Data Structure**: Keep event payloads lean and structured
3. **Error Handling**: Always handle connection errors gracefully
4. **Cleanup**: Properly disconnect SSE connections on component unmount
5. **Testing**: Test with multiple concurrent connections
6. **Monitoring**: Monitor connection statistics and performance
7. **Documentation**: Document custom event types and payloads
