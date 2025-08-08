# Server-Sent Events (SSE) Implementation

A professional, production-ready SSE implementation for real-time server-to-client notifications.

## Quick Start

### 1. Test the Demo

Visit `/sse-demo` to see the SSE functionality in action:

```bash
npm run dev
# Open http://localhost:3000/sse-demo
```

### 2. Use in Your Components

```typescript
import { useSSE } from "@/lib/hooks/useSSE";

function MyComponent() {
  const { isConnected, lastMessage } = useSSE({
    userId: "user123",
    onMessage: (event) => {
      console.log("Received:", event);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastMessage && (
        <p>Last message: {JSON.stringify(lastMessage.data)}</p>
      )}
    </div>
  );
}
```

### 3. Send Events from Backend

```typescript
import { SSE } from "@/lib/sse";

// Broadcast to all clients
SSE.broadcast("notification", { message: "Hello everyone!" });

// Send to specific user
SSE.toUser("user123", "update", { data: "User-specific update" });

// Send to specific session
SSE.toSession("session456", "alert", { warning: "Session alert" });
```

### 4. Use Utility Functions

```typescript
import { notifyUser, updateUser, alertUser } from "@/lib/sse-utils";

// Send notifications
notifyUser("user123", {
  title: "New Message",
  message: "You have a new message",
  type: "info",
});

// Send updates
updateUser("user123", {
  entity: "order",
  entityId: "order456",
  changes: { status: "shipped" },
});

// Send alerts
alertUser("user123", {
  message: "System maintenance in 5 minutes",
  severity: "medium",
});
```

## API Reference

### Server-Side API

```typescript
import { SSE } from "@/lib/sse";

// Core functions
SSE.broadcast(event, data); // Send to all clients
SSE.toUser(userId, event, data); // Send to specific user
SSE.toSession(sessionId, event, data); // Send to specific session
SSE.toClient(clientId, event, data); // Send to specific client
SSE.getStats(); // Get connection statistics
```

### Client-Side Hook

```typescript
import { useSSE } from "@/lib/hooks/useSSE";

const {
  isConnected,
  clientId,
  lastMessage,
  error,
  reconnectAttempts,
  connect,
  disconnect,
  reconnect
} = useSSE({
  userId?: string,
  sessionId?: string,
  metadata?: Record<string, any>,
  onConnect?: (clientId: string) => void,
  onDisconnect?: () => void,
  onError?: (error: Event) => void,
  onMessage?: (event: SSEEvent) => void,
  reconnectInterval?: number,
  maxReconnectAttempts?: number,
});
```

### Utility Functions

```typescript
import {
  notifyUser,
  notifyAll,
  updateUser,
  updateAll,
  alertUser,
  alertAll,
  WebhookHelpers,
  JobHelpers,
  DatabaseHelpers,
} from "@/lib/sse-utils";

// High-level helpers
notifyUser(userId, notificationData);
notifyAll(notificationData);
updateUser(userId, updateData);
updateAll(updateData);
alertUser(userId, alertData);
alertAll(alertData);

// Webhook helpers
WebhookHelpers.handlePaymentSuccess(paymentData);
WebhookHelpers.handleOrderUpdate(orderData);
WebhookHelpers.handleMaintenanceAlert(maintenanceData);

// Job helpers
JobHelpers.handleUploadComplete(uploadData);
JobHelpers.handleProcessingComplete(jobData);

// Database helpers
DatabaseHelpers.handleUserUpdate(userId, changes);
DatabaseHelpers.handleNewComment(commentData);
```

## Features

- ✅ **Real-time Communication** - Instant server-to-client messaging
- ✅ **Connection Management** - Track and manage client connections
- ✅ **Event Targeting** - Send to specific users, sessions, or clients
- ✅ **Auto-reconnection** - Automatic client reconnection with retry logic
- ✅ **Heartbeat System** - Keep connections alive with ping messages
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Resource Cleanup** - Automatic cleanup of disconnected clients
- ✅ **TypeScript Support** - Full TypeScript support with type safety
- ✅ **React Integration** - Easy-to-use React hook
- ✅ **Backend Utilities** - Helper functions for common use cases

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   Backend       │
│                 │    │                 │    │   Integration   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ useSSE Hook    │◄──►│ SSE Manager     │◄──►│ SSE Utilities   │
│ EventSource     │    │ Connection Pool │    │ Webhook Helpers │
│ Auto-reconnect  │    │ Event Dispatch  │    │ Job Helpers     │
│ Error Handling  │    │ Heartbeat       │    │ DB Helpers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Testing

### Manual Testing

1. Open multiple browser tabs to `/sse-demo`
2. Use the test buttons to send different events
3. Observe real-time message delivery
4. Test connection status and error scenarios

### API Testing

```bash
# Test SSE connection
curl -N "http://localhost:3000/api/sse?userId=test&sessionId=test"

# Send test event
curl -X POST "http://localhost:3000/api/sse/test" \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{"message":"Hello"},"broadcast":true}'
```

## Production Considerations

1. **Authentication** - Implement proper user authentication
2. **Rate Limiting** - Add rate limiting for connections
3. **Monitoring** - Monitor connection statistics and errors
4. **Scaling** - Consider Redis for multi-server deployments
5. **Security** - Validate all event data and implement CORS properly

## Support

For questions or issues, refer to the comprehensive documentation in `docs/SSE_IMPLEMENTATION.md`.
