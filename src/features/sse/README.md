# SSE (Server-Sent Events) Feature

A reusable, abstracted Server-Sent Events layer for real-time, server-to-client notifications across the Nomey application.

## 🎯 Overview

This SSE implementation provides:

- ✅ Centralized connection management
- ✅ Event dispatching with named events and JSON payloads
- ✅ User and session-based targeting
- ✅ Automatic heartbeat/ping mechanism
- ✅ Connection lifecycle management with cleanup
- ✅ Reconnection support on the client side
- ✅ Comprehensive error handling and logging
- ✅ Type-safe API with TypeScript

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │────│   SSE Endpoint   │────│   SSE Manager   │
│   (React Hook)  │    │   /api/sse       │    │   (Singleton)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EventSource   │    │  ReadableStream  │    │  Connection Map │
│   (Browser API) │    │  (Web Streams)   │    │  (In Memory)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Client-Side Usage

```tsx
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { isConnected, lastEvent, connect, disconnect } = useSSE(
    "my-session-id",
    { reconnect: true },
    () => console.log("Connected!"),
    () => console.log("Disconnected!"),
    (error) => console.error("SSE Error:", error),
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <p>Last Event: {lastEvent?.type}</p>
    </div>
  );
}
```

### 2. Backend Integration

```ts
import {
  broadcastNotification,
  notifyUser,
  sendSystemNotification,
} from "@/features/sse/utils";

// Broadcast to all connected clients
broadcastNotification("new_post", {
  postId: "123",
  title: "New Post Published",
  author: "John Doe",
});

// Send to specific user
notifyUser("user-123", "direct_message", {
  from: "user-456",
  message: "Hello!",
});

// System notifications
sendSystemNotification("Server maintenance in 5 minutes", "warning");
```

## 📡 API Endpoints

### GET `/api/sse`

Establishes SSE connection for real-time events.

**Query Parameters:**

- `sessionId` (optional): Session identifier for targeting

**Headers:**

- `Content-Type`: `text/event-stream`
- `Cache-Control`: `no-cache, no-transform`
- `Connection`: `keep-alive`

### POST `/api/sse/send`

Send events to connected clients.

**Request Body:**

```json
{
  "type": "broadcast|user|session|system",
  "eventType": "notification",
  "data": { "message": "Hello World" }
}
```

### GET `/api/sse/stats`

Get connection statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalConnections": 10,
    "activeConnections": 8,
    "userConnections": 5,
    "sessionConnections": 3
  }
}
```

## 🎣 React Hook API

### `useSSE(sessionId?, options?, onConnect?, onDisconnect?, onError?)`

**Parameters:**

- `sessionId?: string` - Optional session identifier
- `options?: SSEClientOptions` - Connection options
- `onConnect?: () => void` - Connection callback
- `onDisconnect?: () => void` - Disconnection callback
- `onError?: (error: Error) => void` - Error callback

**Returns:**

```ts
{
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: SSEEvent | null;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (type: string, handler: SSEEventHandler) => void;
  removeEventListener: (type: string, handler: SSEEventHandler) => void;
}
```

**Options:**

```ts
interface SSEClientOptions {
  reconnect?: boolean; // Auto-reconnect (default: true)
  reconnectInterval?: number; // Reconnect delay (default: 3000ms)
  maxReconnectAttempts?: number; // Max attempts (default: 5)
}
```

## 🔧 Backend Utilities

### Core Functions

```ts
// Broadcast to all clients
broadcastNotification(type: string, data: Record<string, any>): number

// Target specific user
notifyUser(userId: string, type: string, data: Record<string, any>): number

// Target specific session
notifySession(sessionId: string, type: string, data: Record<string, any>): number

// System notifications
sendSystemNotification(message: string, severity?: "info"|"warning"|"error"): number

// Resource updates
sendResourceUpdate(resourceType: string, resourceId: string, action: "created"|"updated"|"deleted", data?: Record<string, any>): number

// Get statistics
getSSEStats(): ConnectionStats
```

## 🎨 Event Types

### Built-in Events

- `connection` - Connection status updates
- `heartbeat` - Keep-alive pings (every 30s)
- `system` - System notifications
- `resource_update` - Resource change notifications
- `notification` - General notifications

### Custom Events

You can send any custom event type:

```ts
broadcastNotification("user_online", { userId: "123", username: "john" });
notifyUser("456", "friend_request", { from: "123", fromName: "John" });
```

## ⚙️ Configuration

### SSE Manager Configuration

```ts
new SSEManager({
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 300000, // 5 minutes
  maxConnections: 1000, // Connection limit
});
```

## 🧪 Testing

Visit `/sse-test` (protected route) to test the SSE functionality:

- Real-time connection status
- Send test notifications
- View connection statistics
- Monitor event logs

## 🛡️ Security

- Authentication required for SSE connections
- Session-based connection tracking
- Rate limiting via Next.js middleware
- Input validation with Zod schemas
- Proper error handling and logging

## 🔍 Monitoring

The SSE system provides comprehensive logging:

```ts
// Connection events
console.log("SSE connection added: {connectionId}", {
  userId,
  sessionId,
  totalConnections,
});

// Event dispatching
console.log('Broadcasted event "notification" to 5/8 connections');

// Heartbeat monitoring
console.log("Heartbeat sent to 8/8 connections");

// Error handling
console.error("SSE connection error:", error);
```

## 🚨 Error Handling

### Client-Side

- Automatic reconnection with exponential backoff
- Connection timeout handling
- Event parsing error recovery
- Graceful degradation when SSE unavailable

### Server-Side

- Connection cleanup on client disconnect
- Resource leak prevention
- Stale connection removal
- Comprehensive error logging

## 📊 Performance Considerations

- **Memory Usage**: Connections stored in memory (consider Redis for scaling)
- **Connection Limits**: Configurable max connections (default: 1000)
- **Heartbeat Overhead**: Minimal payload every 30 seconds
- **Event Throughput**: Optimized for real-time delivery

## 🔄 Integration Examples

### Webhook Integration

```ts
// In webhook handler
export async function POST(request: Request) {
  const webhook = await request.json();

  // Process webhook
  await processWebhook(webhook);

  // Notify relevant users
  sendResourceUpdate("payment", webhook.paymentId, "updated", {
    status: webhook.status,
    amount: webhook.amount,
  });
}
```

### Background Job Integration

```ts
// In job processor
export async function processVideoUpload(videoId: string, userId: string) {
  // Process video
  const result = await processVideo(videoId);

  // Notify user of completion
  notifyUser(userId, "video_processed", {
    videoId,
    status: result.status,
    thumbnailUrl: result.thumbnailUrl,
  });
}
```

## 🧩 Extension Points

The SSE system is designed for extensibility:

1. **Custom Event Types**: Add new event types as needed
2. **Authentication**: Integrate with different auth providers
3. **Persistence**: Add Redis/database backing for scaling
4. **Rate Limiting**: Implement per-user/session limits
5. **Analytics**: Track event delivery and engagement

## 📝 Best Practices

1. **Event Naming**: Use descriptive, hierarchical names (`user.profile.updated`)
2. **Payload Size**: Keep payloads small for performance
3. **Error Handling**: Always handle connection errors gracefully
4. **Cleanup**: Properly disconnect when components unmount
5. **Rate Limiting**: Avoid flooding clients with rapid events
6. **Testing**: Use the test page to verify functionality

---

For questions or issues, refer to the [Nomey Documentation](https://nomey.mintlify.app) or check the implementation in `src/features/sse/`.
