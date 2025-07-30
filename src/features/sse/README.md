# Server-Sent Events (SSE) Feature

A comprehensive SSE implementation for real-time server-to-client notifications in the Nomey application.

## Overview

This SSE feature provides a centralized, abstracted layer for real-time communication between the server and clients. It includes connection management, event dispatching, heartbeat mechanisms, and utility functions for easy integration with backend modules.

## Features

- ✅ **Centralized SSE Manager**: Track active client connections and manage lifecycle
- ✅ **Event Broadcasting**: Send events to specific clients, users, or all connected clients
- ✅ **Heartbeat Mechanism**: Keep connections alive with automatic ping messages
- ✅ **Connection Cleanup**: Proper handling of client disconnects and resource cleanup
- ✅ **Error Handling**: Robust error handling with logging and recovery
- ✅ **Statistics**: Monitor connection stats and event counts
- ✅ **React Hook**: Easy-to-use React hook for client-side SSE integration
- ✅ **tRPC Integration**: Server-side API for SSE management and testing
- ✅ **Demo UI**: Interactive demo showcasing all SSE functionality

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   SSE Manager   │    │  Backend APIs   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  useSSE     │◄┼────┼►│ SSEManager  │◄┼────┼►│ SSE Utils   │ │
│ │   Hook      │ │    │ │             │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ SSEDemo     │ │    │ │ Connection  │ │    │ │ tRPC Router │ │
│ │ Component   │ │    │ │ Tracking    │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### SSE Stream Endpoint

- **URL**: `/api/sse`
- **Method**: `GET`
- **Description**: Establishes SSE connection and streams events to clients

### tRPC SSE Router

- **Namespace**: `sse.*`
- **Available Procedures**:
  - `sse.getStats()` - Get connection statistics
  - `sse.getActiveClients()` - Get active client IDs
  - `sse.isClientConnected()` - Check if client is connected
  - `sse.sendTestNotification()` - Send test notification to client
  - `sse.sendSystemNotification()` - Send system notification
  - `sse.sendUserNotification()` - Send user-specific notification
  - `sse.broadcastNotification()` - Broadcast to all clients

## Usage

### Client-Side (React)

```typescript
import { useSSE } from "@/features/sse";

function MyComponent() {
  const {
    status,
    clientId,
    userId,
    connect,
    disconnect,
    addEventListener,
  } = useSSE({
    onMessage: (event, data) => {
      console.log(`Received ${event}:`, data);
    },
  });

  // Add specific event listeners
  useEffect(() => {
    const handleNotification = (event: string, data: any) => {
      // Handle notification
    };

    addEventListener("notification", handleNotification);
  }, [addEventListener]);

  return (
    <div>
      <p>Status: {status}</p>
      <p>Client ID: {clientId}</p>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### Server-Side (Backend Modules)

```typescript
import {
  sendNotificationToUser,
  broadcastNotification,
  sendSystemNotification,
  sendProgressUpdate,
} from "@/features/sse";

// Send notification to specific user
await sendNotificationToUser(userId, "notification", {
  title: "New Message",
  message: "You have a new message",
  type: "info",
});

// Broadcast to all clients
await broadcastNotification("system", {
  message: "System maintenance in 5 minutes",
  type: "warning",
});

// Send progress update
await sendProgressUpdate("upload_123", 75, "processing", "Processing video...");

// Send system notification
await sendSystemNotification("Server will restart in 5 minutes", "warning");
```

### Webhook Integration

```typescript
// In webhook handlers
import { sendVideoProcessingStatus } from "@/features/sse";

export async function POST(request: Request) {
  const { videoId, userId, status } = await request.json();

  // Send real-time update to user
  await sendVideoProcessingStatus(userId, videoId, status, 100);

  return new Response("OK");
}
```

## Configuration

The SSE manager can be configured with the following options:

```typescript
const sseManager = new SSEManager({
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  connectionTimeout: 300000, // 5 minutes
  enableLogging: true,
});
```

## Event Types

### Built-in Events

- `connected` - Sent when client connects
- `heartbeat` - Periodic ping to keep connection alive
- `notification` - User-specific notifications
- `system` - System-wide notifications
- `progress` - Progress updates for tasks
- `chat_message` - Chat message notifications
- `friend_request` - Friend request notifications
- `video_processing` - Video processing status updates

### Custom Events

You can send any custom event type with arbitrary payloads:

```typescript
await sseManager.broadcast("custom_event", {
  customData: "value",
  timestamp: Date.now(),
});
```

## Error Handling

The SSE implementation includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Stream Errors**: Graceful handling of stream failures
- **Client Disconnects**: Proper cleanup of disconnected clients
- **Resource Limits**: Protection against connection limit exceeded
- **Timeout Handling**: Automatic cleanup of stale connections

## Monitoring

### Connection Statistics

```typescript
const stats = sseManager.getStats();
console.log(stats);
// {
//   totalConnections: 150,
//   activeConnections: 45,
//   totalEventsSent: 1234,
//   totalBroadcasts: 56
// }
```

### Active Clients

```typescript
const activeClients = sseManager.getActiveClientIds();
console.log(activeClients);
// ["client_1234567890_abc123", "client_1234567891_def456"]
```

## Demo

Visit `/sse-demo` to see the SSE functionality in action. The demo includes:

- Real-time connection status
- Live statistics
- Test buttons for different notification types
- Message history
- Connection management

## Testing

The SSE implementation includes comprehensive testing:

```bash
# Run all tests
npm run test

# Run SSE-specific tests
npm run test -- --grep "SSE"
```

## Performance Considerations

- **Connection Limits**: Default max 1000 concurrent connections
- **Heartbeat Interval**: 30-second intervals to keep connections alive
- **Cleanup Intervals**: Automatic cleanup every minute
- **Memory Management**: Proper cleanup of disconnected clients
- **Error Recovery**: Automatic reconnection with backoff

## Security

- **CORS Headers**: Proper CORS configuration for cross-origin requests
- **Session Integration**: User identification through NextAuth sessions
- **Input Validation**: All inputs are validated using Zod schemas
- **Error Logging**: Comprehensive error logging for debugging

## Dependencies

- **Next.js**: App router and API routes
- **tRPC**: Type-safe API layer
- **React**: Client-side hooks and components
- **Tailwind CSS**: Styling for demo components

## Contributing

When adding new SSE functionality:

1. Add new event types to the types file
2. Create utility functions in `sse-utils.ts`
3. Add tRPC procedures if needed
4. Update the React hook to handle new events
5. Add tests for new functionality
6. Update documentation

## License

This SSE implementation is part of the Nomey application and follows the same license terms.
