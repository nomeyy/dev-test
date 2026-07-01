# Server-Sent Events (SSE) Service

A comprehensive, abstracted Server-Sent Events layer that enables real-time, server-to-client notifications across the application.

## 🎯 Overview

This SSE service provides a centralized manager to:

- Track active client connections (per user or session)
- Send named events with payloads to specific clients or broadcast to multiple clients
- Handle client connection lifecycle (connect, disconnect, errors)
- Provide a clean API for backend modules to send notifications
- Ensure SSE connections remain alive with heartbeat/ping messages
- Clean up client connections properly to avoid resource leaks

## 🏗️ Architecture

The service consists of several layers:

1. **SSE Manager** (`index.ts`) - Core SSE functionality and client management
2. **Backend API** (`backend-api.ts`) - High-level functions for backend integration
3. **SSE Service** (`sse-service.ts`) - Socket.IO-based SSE implementation
4. **Socket Server** (`socket-server.ts`) - Socket.IO server with authentication
5. **SSE Utils** (`sse-utils.ts`) - Utility functions and helpers
6. **API Routes** - Next.js API endpoints for SSE connections

## 🚀 Quick Start

### 1. Client Connection

```typescript
// In your React component
import { useEventSource } from '@/hooks/useEventSource';

function MyComponent() {
  const { connected, addHandler, removeHandler } = useEventSource({
    userId: 'user123',
    username: 'john_doe'
  });

  useEffect(() => {
    const handleNotification = (data: any) => {
      console.log('Received notification:', data);
    };

    addHandler('notification', handleNotification);

    return () => removeHandler('notification');
  }, [addHandler, removeHandler]);

  return (
    <div>
      Status: {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

### 2. Backend Integration

```typescript
// In your webhook handler, job processor, or API route
import {
  sendPaymentNotification,
  sendJobNotification,
} from "@/lib/sse/backend-api";

// Send payment notification
sendPaymentNotification(
  "payment123",
  "completed",
  {
    amount: 99.99,
    currency: "USD",
    customerId: "user456",
    orderId: "order789",
  },
  "user",
  "user456",
);

// Send job completion notification
sendJobNotification(
  "video-processing",
  "completed",
  {
    videoId: "video123",
    duration: "2:30",
    quality: "1080p",
  },
  "user",
  "user789",
);
```

## 📡 API Reference

### Core SSE Manager

#### `SSEManager.sendToClient(clientId, event, data, metadata?)`

Send an event to a specific client.

```typescript
SSEManager.sendToClient("client123", "user:message", {
  message: "Hello from server!",
  sender: "admin",
});
```

#### `SSEManager.sendToUser(userId, event, data, metadata?)`

Send an event to all connections of a specific user.

```typescript
SSEManager.sendToUser("user123", "profile:updated", {
  field: "avatar",
  newValue: "avatar.jpg",
});
```

#### `SSEManager.broadcast(event, data, metadata?)`

Broadcast an event to all connected clients.

```typescript
SSEManager.broadcast("system:maintenance", {
  message: "Scheduled maintenance in 10 minutes",
  duration: "2 hours",
});
```

### Backend Integration API

#### Webhook Notifications

```typescript
// Payment notifications
sendPaymentNotification(
  paymentId,
  "completed",
  {
    amount: 99.99,
    currency: "USD",
    customerId: "user123",
  },
  "user",
  "user123",
);

// User account notifications
sendUserAccountNotification(
  "user123",
  "created",
  {
    email: "john@example.com",
    username: "john_doe",
  },
  "user",
  "user123",
);

// System health notifications
sendSystemHealthNotification(
  "database",
  "warning",
  {
    message: "High memory usage detected",
    metrics: { memoryUsage: "85%" },
  },
  "channel",
  "system-monitoring",
);
```

#### Job Processing Notifications

```typescript
// Video processing
sendVideoProcessingNotification(
  "video123",
  "completed",
  {
    title: "My Video",
    duration: "3:45",
    quality: "4K",
  },
  "user",
  "user123",
);

// Data export
sendDataExportNotification(
  "export123",
  "completed",
  {
    format: "CSV",
    recordCount: 1000,
    fileSize: "2.5MB",
    downloadUrl: "/downloads/export123.csv",
  },
  "user",
  "user123",
);
```

#### Real-time Updates

```typescript
// Content updates
sendPostUpdateNotification(
  "post123",
  "created",
  {
    title: "New Blog Post",
    author: "Jane Doe",
    category: "Technology",
  },
  "channel",
  "content-updates",
);

// Profile updates
sendProfileUpdateNotification(
  "user123",
  "avatar_changed",
  {
    username: "john_doe",
    avatarUrl: "/avatars/new-avatar.jpg",
  },
  "user",
  "user123",
);
```

## 🔧 Configuration

### Environment Variables

```bash
# SSE Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
SSE_HEARTBEAT_INTERVAL=3000
SSE_CLEANUP_INTERVAL=5000
SSE_MAX_CONNECTIONS=1000
```

### Server Configuration

```typescript
// In server.js
const io = new IOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  path: "/socket.io",
});
```

## 📊 Connection Management

### Client Tracking

The service automatically tracks:

- Client connections with unique IDs
- User associations (userId, username)
- Connection timestamps and activity
- Connection status and health

### Heartbeat System

- **Client-side**: Sends ping every 3 seconds
- **Server-side**: Sends heartbeat every 30 seconds
- **Cleanup**: Removes inactive connections after 5 minutes

### Connection Statistics

```typescript
import { SSEManager } from "@/lib/sse";

const stats = SSEManager.getConnections();
console.log(`Total connections: ${stats.total}`);
console.log(`Active users: ${stats.activeUsers.size}`);
```

## 🛡️ Security & Authentication

### Authentication

- Socket.IO connections require `userId` or `token` in handshake
- SSE connections can include `userId` and `username` as query parameters
- Rate limiting prevents abuse (100ms minimum between events)

### CORS Configuration

```typescript
cors: {
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  methods: ['GET', 'POST'],
  credentials: true
}
```

## 🧪 Testing

### Manual Testing

1. Open multiple browser tabs
2. Connect to the SSE endpoint
3. Send test notifications via the API
4. Verify real-time updates across tabs

### Automated Testing

```typescript
// Test SSE connection
import { renderHook } from "@testing-library/react";
import { useEventSource } from "@/hooks/useEventSource";

test("SSE connection establishes successfully", () => {
  const { result } = renderHook(() =>
    useEventSource({
      userId: "test-user",
      username: "test-username",
    }),
  );

  expect(result.current.connected).toBe(true);
});
```

## 📝 Best Practices

### 1. Event Naming Convention

Use descriptive, hierarchical event names:

- `user:login`
- `payment:completed`
- `system:maintenance`
- `content:post:created`

### 2. Error Handling

Always wrap SSE operations in try-catch blocks:

```typescript
try {
  const result = SSEManager.sendToUser(userId, "notification", data);
  if (result === 0) {
    console.warn("User not online");
  }
} catch (error) {
  console.error("Failed to send notification:", error);
}
```

### 3. Connection Cleanup

Ensure proper cleanup in React components:

```typescript
useEffect(() => {
  const handler = (data: any) => console.log(data);
  addHandler("event", handler);

  return () => removeHandler("event");
}, [addHandler, removeHandler]);
```

### 4. Performance Considerations

- Use targeted notifications instead of broadcasting when possible
- Implement rate limiting for high-frequency events
- Monitor connection counts and implement scaling strategies

## 🚨 Troubleshooting

### Common Issues

1. **Connection not establishing**
   - Check CORS configuration
   - Verify server is running
   - Check browser console for errors

2. **Events not received**
   - Verify event handler registration
   - Check event name matching
   - Ensure client is connected

3. **Memory leaks**
   - Verify proper cleanup in useEffect
   - Check for abandoned connections
   - Monitor connection counts

### Debug Mode

Enable debug logging:

```typescript
// In your component
const { connected, addHandler } = useEventSource({
  userId: "user123",
  username: "john_doe",
  debug: true, // Enable debug logging
});
```

## 🔄 Migration from Socket.IO

If you're migrating from Socket.IO to pure SSE:

1. Replace Socket.IO event listeners with SSE handlers
2. Update connection management code
3. Use the new backend API functions
4. Test thoroughly for any breaking changes

## 📚 Additional Resources

- [MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## 🤝 Contributing

When adding new features:

1. Follow the existing code structure
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Add appropriate tests

## 📄 License

This SSE service is part of the Nomey application and follows the same licensing terms.
