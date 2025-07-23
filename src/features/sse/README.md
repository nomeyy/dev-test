# Server-Sent Events (SSE) Feature

A reusable, abstracted SSE layer for real-time server-to-client notifications across the Nomey application.

## Overview

The SSE feature provides:

- Centralized connection management
- Named event dispatching with JSON payloads
- Heartbeat/ping mechanism to keep connections alive
- Clean APIs for backend modules to send notifications
- Automatic connection cleanup and error handling

## Architecture

### Core Components

- **SSE Service** (`services/sse-service.ts`) - Central connection manager
- **API Route** (`/api/sse`) - HTTP endpoint for client connections
- **React Hook** (`hooks/useSSE.ts`) - Client-side connection management
- **tRPC Router** (`trpc/router.ts`) - Backend API for sending events
- **Types** (`types/index.ts`) - TypeScript definitions and schemas

### Event Types

The system supports the following event types:

- `PING` - Heartbeat messages to keep connections alive
- `NOTIFICATION` - User notifications with title, message, and level
- `USER_UPDATE` - User profile or data updates
- `REEL_UPLOAD_STATUS` - Video upload progress and status updates
- `SYSTEM_MESSAGE` - System-wide announcements

## Usage

### Client-Side (React Components)

```tsx
import { useSSE, SSEEventType } from "@/features/sse";

function MyComponent() {
  const {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    connectionId,
    connect,
    disconnect,
    sendTestEvent,
  } = useSSE({
    userId: "user-123",
    onEvent: (event) => {
      console.log("Received event:", event);
    },
    onConnect: () => {
      console.log("SSE connected!");
    },
    onDisconnect: () => {
      console.log("SSE disconnected!");
    },
    onError: (err) => {
      console.error("SSE error:", err);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <button onClick={connect} disabled={isConnected}>
        Connect
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
      <button
        onClick={() =>
          sendTestEvent(SSEEventType.NOTIFICATION, {
            title: "Test",
            message: "Hello World!",
          })
        }
        disabled={!isConnected}
      >
        Send Test Event
      </button>
    </div>
  );
}
```

### Server-Side (Backend Modules)

#### Using tRPC Procedures

```typescript
import { api } from "@/trpc/server";

// Send event to specific connection
await api.sse.sendEventToConnection({
  connectionId: "conn-123",
  event: {
    id: nanoid(),
    type: SSEEventType.NOTIFICATION,
    timestamp: Date.now(),
    data: {
      title: "Upload Complete",
      message: "Your video has been processed successfully",
      level: "success",
    },
  },
});

// Send event to all connections for a user
await api.sse.sendEventToUser({
  userId: "user-123",
  event: {
    id: nanoid(),
    type: SSEEventType.USER_UPDATE,
    timestamp: Date.now(),
    data: {
      userId: "user-123",
      field: "profileImage",
      value: "new-image-url.jpg",
    },
  },
});

// Broadcast event to all connected clients
await api.sse.broadcastEvent({
  event: {
    id: nanoid(),
    type: SSEEventType.SYSTEM_MESSAGE,
    timestamp: Date.now(),
    data: {
      message: "System maintenance in 10 minutes",
      level: "warning",
    },
  },
});
```

#### Direct Service Usage

```typescript
import { sseService } from "@/features/sse";

// Send notification to user
const event = {
  id: nanoid(),
  type: SSEEventType.NOTIFICATION,
  timestamp: Date.now(),
  data: {
    title: "New Message",
    message: "You have a new message from John",
    level: "info",
  },
};

const sentCount = await sseService.sendEventToUser("user-123", event);
console.log(`Event sent to ${sentCount} connections`);
```

### Webhook Integration Example

```typescript
// In a webhook handler (e.g., Mux video processing)
import { sseService } from "@/features/sse";

export async function handleMuxWebhook(webhookData: MuxWebhookData) {
  const { userId, uploadId, status } = webhookData;

  // Send real-time update to user
  await sseService.sendEventToUser(userId, {
    id: nanoid(),
    type: SSEEventType.REEL_UPLOAD_STATUS,
    timestamp: Date.now(),
    data: {
      uploadId,
      status,
      progress: status === "ready" ? 100 : 75,
      message: status === "ready" ? "Video ready!" : "Processing video...",
    },
  });
}
```

## Configuration

### Hook Options

```typescript
interface UseSSEOptions {
  userId?: string; // User ID for connection tracking
  autoReconnect?: boolean; // Auto-reconnect on disconnect (default: true)
  reconnectInterval?: number; // Reconnect delay in ms (default: 3000)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
  onConnect?: () => void; // Connection established callback
  onDisconnect?: () => void; // Connection lost callback
  onError?: (error: Error) => void; // Error callback
  onEvent?: (event: SSEEventUnion) => void; // Event received callback
}
```

### Service Configuration

The SSE service automatically manages:

- **Heartbeat Interval**: 30 seconds
- **Connection Timeout**: 60 seconds
- **Automatic Cleanup**: Removes stale connections
- **Error Recovery**: Handles connection failures gracefully

## Testing

Visit `/sse-test` to access the SSE testing page, which provides:

- Connection status monitoring
- Manual connect/disconnect controls
- Test event sending buttons
- Real-time event history display

## Error Handling

The SSE system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Send Failures**: Graceful degradation and connection cleanup
- **Stale Connections**: Automatic detection and removal
- **Invalid Events**: Schema validation and error logging

## Performance Considerations

- Connections are cleaned up automatically when clients disconnect
- Heartbeat mechanism prevents connection timeouts
- Event broadcasting is optimized for multiple connections
- Memory usage is monitored and managed through connection limits

## Security

- CORS headers are properly configured
- Connection tracking includes user and session identification
- Event validation prevents malformed data injection
- Rate limiting can be applied at the middleware level
