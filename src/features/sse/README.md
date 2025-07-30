# Server-Sent Events (SSE) Feature

A comprehensive, production-ready Server-Sent Events implementation for real-time, server-to-client notifications.

## Overview

This SSE system provides a robust foundation for real-time communication in your application. It includes connection management, event dispatching, heartbeat mechanisms, and clean integration APIs for backend services.

## Features

- ✅ **Centralized SSE Manager**: Track active client connections per user/session
- ✅ **Named Events**: Send typed events with JSON payloads to specific clients or broadcast
- ✅ **Connection Lifecycle**: Proper handling of connect, disconnect, and error states
- ✅ **Backend Integration**: Simple utility functions for sending notifications
- ✅ **Heartbeat/Ping**: Keep connections alive with automatic heartbeat mechanism
- ✅ **Resource Cleanup**: Automatic cleanup of disconnected clients to prevent memory leaks
- ✅ **Redis Persistence**: Connection state persisted across server restarts
- ✅ **Type Safety**: Full TypeScript support with predefined event types
- ✅ **Authentication Support**: Integrated with NextAuth.js session management
- ✅ **React Hook**: Client-side hook for easy SSE connection management

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Client (React)    │◄──►│   SSE API Endpoint  │◄──►│   SSE Service       │
│   useSSE Hook       │    │   /api/sse          │    │   Connection Mgmt   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │                           │
                                      ▼                           ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │   Authentication    │    │   Redis Storage     │
                           │   NextAuth.js       │    │   Connection State  │
                           └─────────────────────┘    └─────────────────────┘
                                      ▲
                                      │
                           ┌─────────────────────┐
                           │   Backend Services  │
                           │   SSE Utils         │
                           └─────────────────────┘
```

## Quick Start

### 1. Client-Side Usage

```tsx
import { useSSE, SSE_EVENT_TYPES } from "@/features/sse";

function MyComponent() {
  const sse = useSSE({
    autoConnect: true,
    autoReconnect: true,
  });

  // Listen to specific event types
  useEffect(() => {
    const removeListener = sse.addEventListener(
      SSE_EVENT_TYPES.NOTIFICATION,
      (event) => {
        console.log("Notification received:", event.data);
      },
    );

    return removeListener;
  }, [sse]);

  return (
    <div>
      <p>Connection: {sse.status}</p>
      <button onClick={sse.connect}>Connect</button>
      <button onClick={sse.disconnect}>Disconnect</button>
    </div>
  );
}
```

### 2. Backend Integration

```typescript
import {
  sendNotificationToUsers,
  broadcastNotification,
  sendVideoUploadProgress,
} from "@/features/sse";

// Send notification to specific users
await sendNotificationToUsers(
  ["user1", "user2"],
  "Your video is ready!",
  "success",
);

// Broadcast to all connected users
await broadcastNotification("System maintenance in 5 minutes", "warning");

// Send video upload progress
await sendVideoUploadProgress("user123", "upload456", 75, "processing");
```

## API Reference

### Client-Side Hook

#### `useSSE(options?: SSEOptions)`

React hook for managing SSE connections.

**Options:**

- `autoConnect?: boolean` - Automatically connect on mount (default: `true`)
- `autoReconnect?: boolean` - Retry connection on failure (default: `true`)
- `reconnectDelay?: number` - Reconnection delay in ms (default: `3000`)
- `maxReconnectAttempts?: number` - Max reconnection attempts (default: `5`)
- `headers?: Record<string, string>` - Additional headers

**Returns:**

- `status: "disconnected" | "connecting" | "connected" | "error"`
- `lastEvent: SSEEvent | null`
- `error: string | null`
- `reconnectAttempts: number`
- `connect(): void`
- `disconnect(): void`
- `addEventListener(eventType: string, listener: EventListener): () => void`
- `removeEventListener(eventType: string, listener: EventListener): void`

### Backend Utilities

#### `sendNotificationToUsers(userIds, message, type?, metadata?)`

Send notification to specific users.

```typescript
await sendNotificationToUsers(
  "user123", // or ["user1", "user2"]
  "Your order is ready!",
  "success", // "info" | "success" | "warning" | "error"
  { orderId: "order123" },
);
```

#### `broadcastNotification(message, type?, metadata?)`

Broadcast notification to all connected users.

```typescript
await broadcastNotification("New feature released!", "info", {
  version: "1.2.0",
});
```

#### `sendVideoUploadProgress(userId, uploadId, progress, status, metadata?)`

Send video upload progress update.

```typescript
await sendVideoUploadProgress(
  "user123",
  "upload456",
  85, // progress percentage
  "processing", // "uploading" | "processing" | "complete" | "error"
  { filename: "video.mp4" },
);
```

#### `sendVideoReady(userId, assetId, videoData)`

Send video ready notification.

```typescript
await sendVideoReady("user123", "asset456", {
  title: "My Video",
  duration: 120,
  playbackUrl: "https://stream.mux.com/xyz.m3u8",
  thumbnailUrl: "https://image.mux.com/xyz/thumbnail.jpg",
});
```

#### `sendCustomEvent(eventType, data, options, eventId?)`

Send custom event with flexible targeting.

```typescript
await sendCustomEvent(
  "custom_event",
  { message: "Custom data" },
  { userIds: ["user1", "user2"] }, // or { broadcast: true }
  "custom-123",
);
```

#### `getSSEStats()`

Get current SSE service statistics.

```typescript
const stats = await getSSEStats();
// Returns: { totalClients, authenticatedClients, anonymousClients, userDistribution }
```

### Event Types

Built-in event types available in `SSE_EVENT_TYPES`:

- `HEARTBEAT` - Keep-alive messages
- `CONNECTION_ESTABLISHED` - Sent when client connects
- `NOTIFICATION` - General notifications
- `VIDEO_UPLOAD_PROGRESS` - Video upload progress updates
- `VIDEO_READY` - Video processing complete
- `SEARCH_UPDATE` - Search index updates
- `USER_UPDATE` - User profile/settings updates

## Configuration

The SSE service can be configured when instantiated:

```typescript
import { SSEService } from "@/features/sse";

const sseService = new SSEService({
  heartbeatInterval: 30000, // 30 seconds
  clientTimeout: 300000, // 5 minutes
  maxConnectionsPerUser: 5, // Max connections per user
  redisKeyPrefix: "sse:", // Redis key prefix
});
```

## Integration Examples

### Mux Webhook Integration

The system includes example integration with Mux webhooks for video processing notifications:

```typescript
// In your webhook handler
import { sendVideoReady, sendVideoUploadProgress } from "@/features/sse";

case "video.asset.ready":
  await sendVideoReady(userId, assetData.id, {
    title: assetData.master?.name,
    duration: assetData.duration,
    playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
  });
  break;
```

### Custom Service Integration

```typescript
// In your business logic
import { sendNotificationToUsers } from "@/features/sse";

async function processOrder(orderId: string, userId: string) {
  // ... process order

  // Notify user
  await sendNotificationToUsers(
    userId,
    "Your order has been processed!",
    "success",
    { orderId },
  );
}
```

## Testing

Visit `/temps/sse-test` to access the built-in test interface that allows you to:

- Connect/disconnect from SSE endpoint
- View real-time events
- Filter events by type
- Send test events manually
- Monitor connection status

## Security Considerations

- SSE endpoint respects authentication state
- Users can only receive events targeted to them (unless broadcast)
- Connection limits prevent resource exhaustion
- Proper CORS headers configured
- Redis storage secured with key prefixes

## Production Deployment

### Environment Variables

Ensure these environment variables are set:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Performance Considerations

- Redis is used for connection persistence
- Heartbeat mechanism prevents stale connections
- Automatic cleanup of disconnected clients
- Connection limits per user prevent abuse
- Events are queued efficiently

### Monitoring

Monitor SSE health using:

```typescript
import { getSSEStats } from "@/features/sse";

const stats = await getSSEStats();
console.log(`Active connections: ${stats.totalClients}`);
```

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check authentication status
   - Verify CORS headers
   - Ensure Redis is accessible

2. **Events Not Received**
   - Verify user ID targeting
   - Check event listener registration
   - Monitor browser dev tools Network tab

3. **Memory Leaks**
   - Ensure proper cleanup of event listeners
   - Monitor client disconnect handling
   - Check Redis key expiration

### Debug Mode

Enable debug logging:

```typescript
// The service uses the established logging system
// Check console for [SSEService] prefixed logs
```

## Contributing

When extending the SSE system:

1. Add new event types to `SSE_EVENT_TYPES`
2. Create utility functions in `sse-utils.ts`
3. Update TypeScript types in `types/sse.ts`
4. Add tests for new functionality
5. Update documentation

## License

Part of the Nomey application codebase.
