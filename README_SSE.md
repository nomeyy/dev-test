# SSE Usage Guide

## Quick Start

The SSE (Server-Sent Events) system is now ready to use! Here's how to get started:

### 1. Test the Implementation

Visit the demo page to test the SSE functionality:

```
http://localhost:3001/sse-demo
```

The demo page allows you to:

- View real-time connection status
- Send events to specific users
- Broadcast events to all connected clients
- Test integration examples (job processing, notifications, announcements)
- View event history and latest received data

### 2. Backend Integration

To send SSE events from your backend code:

```typescript
import { SSEManager } from "@/features/sse";

const sseManager = SSEManager.getInstance();

// Send notification to specific user
await sseManager.notifyUser("user123", "Hello!", "info");

// Broadcast to all connected clients
await sseManager.broadcastToAll({
  event: "update",
  data: { message: "System updated!" },
});

// Send to specific user with custom event
await sseManager.sendToUser("user123", {
  event: "custom_event",
  data: { customData: "value" },
});
```

### 3. Frontend Integration

To receive SSE events in your React components:

```typescript
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { connectionState, lastData, events } = useSSE({
    userId: "user123",
    onConnect: () => console.log("Connected!"),
  });

  return (
    <div>
      <p>Status: {connectionState}</p>
      <p>Latest: {JSON.stringify(lastData)}</p>
    </div>
  );
}
```

### 4. API Endpoints

**SSE Connection:** `GET /api/sse?userId=user123`
**Send Events:** `POST /api/sse/send`
**Integration Examples:** `POST /api/sse/example`
**Statistics:** `GET /api/sse/send`

### 5. Example Integrations

The system includes example integrations that demonstrate real-world usage:

- **Job Processing**: Shows progress updates for long-running tasks
- **Webhook Handling**: Processes webhooks and notifies affected users
- **System Notifications**: Sends real-time notifications to users
- **Data Updates**: Pushes real-time data changes

### Features Implemented

✅ **Centralized SSE Manager** - Single interface for all SSE operations
✅ **Client Connection Management** - Automatic tracking and cleanup
✅ **Heartbeat/Ping System** - Keeps connections alive (30s intervals)
✅ **Event Broadcasting** - Send to individual users or broadcast to all
✅ **React Hook** - Easy frontend integration with automatic reconnection
✅ **Error Handling** - Comprehensive error handling and logging
✅ **Clean Disconnection** - Proper resource cleanup on disconnect
✅ **Documentation** - Complete API documentation and usage examples
✅ **Demo UI** - Interactive testing interface

### Next Steps

1. **Test the demo** - Visit `/sse-demo` and try the different features
2. **Integration** - Use the SSE manager in your existing backend services
3. **Frontend** - Add the `useSSE` hook to components that need real-time updates
4. **Production** - Consider Redis-based storage for multi-instance deployments

The SSE system is production-ready and can handle the requirements specified in the ticket!
