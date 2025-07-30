# Server-Sent Events (SSE) Documentation

This document provides comprehensive documentation for the Server-Sent Events (SSE) implementation in the Nomey web app.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Frontend Usage](#frontend-usage)
- [Backend Usage](#backend-usage)
- [API Reference](#api-reference)
- [Integration Examples](#integration-examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

Server-Sent Events (SSE) enable real-time, server-to-client notifications. This implementation provides a centralized system for managing client connections, broadcasting events, and handling the complete lifecycle of SSE connections.

### Key Features

- **Centralized SSE Manager** - Tracks active client connections and manages lifecycle
- **Event Broadcasting** - Send events to all clients, specific users, sessions, or individual clients
- **Heartbeat Mechanism** - Keeps connections alive with periodic ping messages
- **Automatic Cleanup** - Properly handles client disconnects and resource cleanup
- **React Hooks** - Easy-to-use hooks for frontend integration
- **Backend Utilities** - Simple API for sending notifications from any backend service
- **Error Handling** - Comprehensive error handling and logging throughout

## Architecture

```
┌─────────────────┐    SSE Connection    ┌─────────────────┐
│   Frontend      │ ◄──────────────────► │   Backend       │
│   (React)       │                      │   (Next.js)     │
│                 │                      │                 │
│ • useSSE Hook   │                      │ • SSE Manager   │
│ • useSSENotif.  │                      │ • Event Router  │
│ • EventSource   │                      │ • Heartbeat     │
└─────────────────┘                      └─────────────────┘
```

### Components

1. **SSE Manager** (`src/features/sse/services/sse-manager.ts`)
   - Manages client connections and lifecycle
   - Handles event broadcasting and targeting
   - Provides heartbeat mechanism

2. **SSE API Route** (`src/app/api/sse/route.ts`)
   - Handles SSE connection establishment
   - Manages connection headers and streaming
   - Provides message sending endpoint

3. **React Hooks** (`src/features/sse/hooks/useSSE.tsx`)
   - `useSSE` - Basic SSE connection and event handling
   - `useSSENotifications` - Specialized hook for notifications

4. **Utility Functions** (`src/features/sse/utils/sse-utils.ts`)
   - High-level functions for common SSE operations
   - Easy integration with backend services

## Frontend Usage

### Basic SSE Connection

```tsx
import { useSSE } from "@/features/sse/hooks/useSSE";

function MyComponent() {
  const { isConnected, clientId, lastMessage, connect, disconnect } = useSSE({
    onConnect: (clientId) => console.log("Connected:", clientId),
    onMessage: (event) => console.log("Message received:", event),
    onError: (error) => console.error("SSE Error:", error),
  });

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <p>Client ID: {clientId}</p>
      {lastMessage && <pre>{JSON.stringify(lastMessage, null, 2)}</pre>}
    </div>
  );
}
```

### Notification Hook

```tsx
import { useSSENotifications } from "@/features/sse/hooks/useSSE";

function NotificationComponent() {
  const { notifications, clearNotifications } = useSSENotifications();

  return (
    <div>
      <h3>Notifications ({notifications.length})</h3>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
        </div>
      ))}
      <button onClick={clearNotifications}>Clear All</button>
    </div>
  );
}
```

### Hook Options

```tsx
interface UseSSEOptions {
  clientId?: string; // Custom client identifier
  sessionId?: string; // Session identifier
  onConnect?: (clientId: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  reconnectInterval?: number; // Base reconnection interval (default: 5000ms)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
  autoConnect?: boolean; // Auto-connect on mount (default: true)
}
```

### Event Types

```tsx
interface SSEEvent {
  id: string;
  event: string;
  data: Record<string, unknown>;
}
```

## Backend Usage

### Utility Functions

#### Sending Notifications

```typescript
import {
  broadcastSSEMessage,
  sendNotificationToUser,
  broadcastSystemUpdate,
} from "@/features/sse/utils/sse-utils";

// Send to all connected clients
await broadcastSSEMessage("notification", {
  title: "System Update",
  message: "New features available!",
  type: "info",
  timestamp: Date.now(),
});

// Send to specific user
await sendNotificationToUser(
  userId,
  "Welcome!",
  "Thanks for joining!",
  "success",
);

// Send system update
await broadcastSystemUpdate("Maintenance scheduled for 2 AM", "maintenance");
```

#### Direct SSE Manager Usage

```typescript
import { sseManager } from "@/features/sse/services/sse-manager";

// Send to specific client
sseManager.sendToClient(clientId, {
  event: "custom_event",
  data: { message: "Hello specific client!" },
});

// Send to all clients of a user
sseManager.sendToUser(userId, {
  event: "user_notification",
  data: { message: "User-specific message" },
});

// Broadcast to all clients
sseManager.broadcast({
  event: "global_announcement",
  data: { message: "Important announcement!" },
});

// Send to all clients of a session
sseManager.sendToSession(sessionId, {
  event: "session_update",
  data: { message: "Session-specific update" },
});
```

### SSE Manager Methods

```typescript
class SSEManager {
  // Add a new client connection
  addClient(
    connection: ReadableStreamDefaultController,
    options?: SSEConnectionOptions,
  ): string;

  // Remove a client connection
  removeClient(clientId: string): boolean;

  // Send message to specific client
  sendToClient(clientId: string, message: SSEMessage): boolean;

  // Send message to all clients
  broadcast(message: SSEMessage): number;

  // Send message to all clients of a user
  sendToUser(userId: string, message: SSEMessage): number;

  // Send message to all clients of a session
  sendToSession(sessionId: string, message: SSEMessage): number;

  // Update client heartbeat
  updateHeartbeat(clientId: string): boolean;

  // Get manager statistics
  getStats(): SSEManagerStats;

  // Clean up all connections
  cleanup(): void;
}
```

## API Reference

### SSE Connection

```
GET /api/sse
```

Establishes an SSE connection. Accepts query parameters:

- `clientId` (optional) - Custom client identifier
- `sessionId` (optional) - Session identifier for session-based targeting

**Response Headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-store, must-revalidate
Connection: keep-alive
Access-Control-Allow-Origin: *
X-Accel-Buffering: no
```

### Send Messages

```
POST /api/sse
```

Send messages to connected clients.

**Request Body:**

```json
{
  "event": "notification",
  "data": {
    "title": "Message Title",
    "message": "Message content",
    "type": "info",
    "timestamp": 1234567890
  },
  "target": "all",
  "targetId": null
}
```

**Target Options:**

- `"all"` - Send to all connected clients
- `"user"` - Send to all clients of a specific user (requires `targetId`)
- `"session"` - Send to all clients of a specific session (requires `targetId`)
- `"client"` - Send to a specific client (requires `targetId`)

**Response:**

```json
{
  "success": true,
  "sentCount": 3,
  "message": "Message sent to 3 client(s)"
}
```

### Status Check

```
GET /api/sse?status=true
```

Returns current SSE manager statistics.

**Response:**

```json
{
  "success": true,
  "stats": {
    "totalConnections": 5,
    "activeConnections": 3,
    "connectionsByUser": { "user1": 2, "user2": 1 },
    "connectionsBySession": { "session1": 2, "session2": 1 }
  },
  "timestamp": 1234567890
}
```

## Integration Examples

### Webhook Integration

```typescript
// In a webhook handler
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Process webhook data...

  // Send notification via SSE
  await broadcastSSEMessage("webhook_received", {
    title: "Webhook Processed",
    message: `Processed webhook: ${body.type}`,
    type: "success",
    timestamp: Date.now(),
  });

  return Response.json({ success: true });
}
```

### Background Job Integration

```typescript
// In a background job processor
export async function processJob(jobData: any) {
  // Process the job...

  // Notify user of completion
  await sendNotificationToUser(
    jobData.userId,
    "Job Complete",
    `Your job "${jobData.name}" has been processed successfully.`,
    "success",
  );
}
```

### Real-time Chat Integration

```typescript
// Send chat message to all users in a room
export async function sendChatMessage(
  roomId: string,
  message: string,
  userId: string,
) {
  await broadcastSSEMessage("chat_message", {
    roomId,
    message,
    userId,
    timestamp: Date.now(),
  });
}
```

### File Upload Progress

```typescript
// Update upload progress for specific user
export async function updateUploadProgress(
  userId: string,
  fileId: string,
  progress: number,
) {
  await sendNotificationToUser(
    userId,
    "Upload Progress",
    `File upload: ${progress}% complete`,
    "info",
  );
}
```

## Testing

### Running SSE Tests

```bash
# Run all SSE-related tests
npm run test -- sse

# Run specific SSE test files
npm run test -- sse-manager
npm run test -- useSSE
```

### Manual Testing

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Test SSE connection:**

   ```bash
   curl -N -H "Accept: text/event-stream" "http://localhost:3000/api/sse"
   ```

3. **Send a test message:**

   ```bash
   curl -X POST http://localhost:3000/api/sse \
     -H "Content-Type: application/json" \
     -d '{"event":"test","data":{"message":"Hello SSE!"},"target":"all"}'
   ```

4. **Check SSE status:**
   ```bash
   curl "http://localhost:3000/api/sse?status=true"
   ```

### Browser Testing

1. Open the SSE Demo page in your browser
2. Check the browser console for connection logs
3. Use the Network tab to monitor SSE requests
4. Test all demo features (send messages, notifications, etc.)

## Troubleshooting

### Common Issues

#### Connection Not Establishing

**Symptoms:** SSE connection fails to establish or immediately disconnects.

**Solutions:**

1. Check server logs for errors
2. Verify CORS headers are set correctly
3. Ensure no proxy/CDN is buffering the response
4. Check browser console for error messages

#### Messages Not Received

**Symptoms:** Connection established but no messages received.

**Solutions:**

1. Verify event listeners are properly set up
2. Check message format and targeting
3. Ensure client is subscribed to the correct events
4. Check server logs for message sending errors

#### Memory Leaks

**Symptoms:** Server memory usage increases over time.

**Solutions:**

1. Ensure proper cleanup on client disconnect
2. Check for abandoned connections in SSE manager
3. Monitor connection statistics via status endpoint
4. Restart server if needed

### Debug Mode

Enable detailed logging by setting the log level in your environment:

```bash
# In your .env file
LOG_LEVEL=debug
```

### Performance Monitoring

Monitor SSE performance using the status endpoint:

```bash
# Get current statistics
curl "http://localhost:3000/api/sse?status=true"
```

Key metrics to watch:

- `totalConnections` - Total number of connections
- `activeConnections` - Currently active connections
- `connectionsByUser` - Connections per user
- `connectionsBySession` - Connections per session

### Best Practices

1. **Connection Management:**
   - Always handle connection cleanup
   - Implement exponential backoff for reconnections
   - Monitor connection health

2. **Message Targeting:**
   - Use specific targeting when possible (user/session/client)
   - Avoid broadcasting to all clients unless necessary
   - Implement message filtering on the client side

3. **Error Handling:**
   - Always implement error handlers
   - Log errors for debugging
   - Provide fallback mechanisms

4. **Performance:**
   - Monitor connection count and memory usage
   - Implement connection limits if needed
   - Use appropriate message sizes

## Demo

Visit the SSE Demo page to see all features in action:

- Real-time connection status
- Live notification updates
- Event broadcasting
- Message history
- Interactive testing tools

The demo automatically sends a welcome notification when you connect and provides tools to test all SSE functionality.

---

For more information, see the [Server-Sent Events MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).
