# Server-Sent Events (SSE) Feature

A reusable, abstracted Server-Sent Events layer for real-time, server-to-client notifications across the Nomey application.

## Overview

This SSE implementation provides:

- **Centralized SSE Manager**: Tracks active client connections and handles event dispatching
- **Client Connection Management**: Handles connect, disconnect, and error scenarios
- **Targeted Messaging**: Send events to specific clients, users, sessions, or broadcast to all
- **Heartbeat Mechanism**: Keeps connections alive and cleansup dead connections
- **React Hooks**: Easy-to-use hooks for client-side SSE integration
- **Utility Functions**: Simple API for backend modules to send notifications

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   SSE Manager   │    │  Backend APIs   │
│                 │    │                 │    │                 │
│  useSSE Hook    │◄──►│  Connection     │◄──►│  SSE Utils      │
│  EventSource    │    │  Management     │    │  Webhook Handlers│
│                 │    │  Heartbeat      │    │  Job Processors  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### GET `/api/sse`

Establishes SSE connection with optional query parameters:

- `clientId`: Custom client identifier
- `sessionId`: Session identifier for targeted messaging

### POST `/api/sse`

Sends messages to SSE clients with body:

```json
{
  "event": "notification",
  "data": { "message": "Hello!" },
  "target": "all|user|session|client",
  "targetId": "user123"
}
```

## Backend Integration Guide

### Quick Start

The SSE system provides high-level utility functions that make it easy to send real-time notifications from any backend service:

```typescript
import {
  broadcastSSEMessage,
  sendNotificationToUser,
  broadcastSystemUpdate,
} from "@/features/sse/utils/sse-utils";

// Send to all users
await broadcastSSEMessage("announcement", {
  title: "New Feature",
  message: "Check out our latest update!",
  timestamp: Date.now(),
});

// Send to specific user
await sendNotificationToUser(
  "user123",
  "Upload Complete",
  "Your video is ready!",
  "success",
);
```

### Available Utility Functions

#### 1. `broadcastSSEMessage(event, data)`

Send a custom event to all connected clients.

```typescript
import { broadcastSSEMessage } from "@/features/sse/utils/sse-utils";

// Broadcast a custom event
await broadcastSSEMessage("data_update", {
  entity: "user",
  action: "profile_updated",
  userId: "user123",
  timestamp: Date.now(),
});

// Returns: number of clients that received the message
```

#### 2. `sendNotificationToUser(userId, title, message, type, data?)`

Send a notification to a specific user.

```typescript
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

// Success notification
await sendNotificationToUser(
  "user123",
  "Payment Successful",
  "Your subscription has been renewed",
  "success",
  { subscriptionId: "sub_123" },
);

// Error notification
await sendNotificationToUser(
  "user123",
  "Upload Failed",
  "There was an error processing your file",
  "error",
  { fileId: "file_456", error: "Invalid format" },
);
```

#### 3. `broadcastSystemUpdate(message, type, data?)`

Send system-wide announcements.

```typescript
import { broadcastSystemUpdate } from "@/features/sse/utils/sse-utils";

// Maintenance announcement
await broadcastSystemUpdate(
  "Scheduled maintenance in 30 minutes",
  "maintenance",
  {
    startTime: "2024-01-15T02:00:00Z",
    duration: "2 hours",
    services: ["upload", "processing"],
  },
);

// General update
await broadcastSystemUpdate("New features are now available!", "update", {
  version: "2.1.0",
  features: ["dark_mode", "bulk_upload"],
});
```

#### 4. `sendSSEMessageToUser(userId, event, data)`

Send a custom event to a specific user.

```typescript
import { sendSSEMessageToUser } from "@/features/sse/utils/sse-utils";

// Send user-specific data
await sendSSEMessageToUser("user123", "user_data_update", {
  profile: { name: "John Doe", email: "john@example.com" },
  preferences: { theme: "dark", notifications: true },
});
```

#### 5. `sendSSEMessageToSession(sessionId, event, data)`

Send a custom event to all clients of a specific session.

```typescript
import { sendSSEMessageToSession } from "@/features/sse/utils/sse-utils";

// Send session-specific data
await sendSSEMessageToSession("session_456", "session_update", {
  lastActivity: Date.now(),
  activeUsers: 5,
  sessionData: {
    /* ... */
  },
});
```

#### 6. `sendSSEMessageToClient(clientId, event, data)`

Send a custom event to a specific client.

```typescript
import { sendSSEMessageToClient } from "@/features/sse/utils/sse-utils";

// Send client-specific data
await sendSSEMessageToClient("client_789", "client_update", {
  status: "active",
  lastPing: Date.now(),
  clientData: {
    /* ... */
  },
});
```

### Integration Patterns

#### 1. Webhook Integration

Integrate SSE notifications into webhook handlers for real-time updates:

```typescript
// src/app/api/webhooks/mux/route.ts
import {
  sendNotificationToUser,
  broadcastSSEMessage,
} from "@/features/sse/utils/sse-utils";

export async function POST(request: NextRequest) {
  const event = await processWebhook(request);

  switch (event.type) {
    case "video.asset.ready":
      // Notify user that their video is ready
      await sendNotificationToUser(
        event.data.userId,
        "Video Ready!",
        "Your video is now available for playback",
        "success",
        {
          assetId: event.data.id,
          playbackId: event.data.playback_ids?.[0]?.id,
        },
      );

      // Broadcast to all users about new content
      await broadcastSSEMessage("new_video_available", {
        assetId: event.data.id,
        userId: event.data.userId,
        timestamp: Date.now(),
      });
      break;

    case "video.asset.errored":
      await sendNotificationToUser(
        event.data.userId,
        "Video Processing Error",
        "There was an error processing your video. Please try again.",
        "error",
        { assetId: event.data.id, error: event.data.error },
      );
      break;
  }

  return new Response("OK", { status: 200 });
}
```

#### 2. Job Processor Integration

Send real-time updates during long-running background jobs:

```typescript
// src/features/jobs/process-video.ts
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

export async function processVideoJob(videoId: string, userId: string) {
  try {
    // Job started
    await sendNotificationToUser(
      userId,
      "Processing Started",
      "Your video is being processed...",
      "info",
      { videoId, status: "processing" },
    );

    // Processing steps
    await processVideoChunks(videoId);
    await sendNotificationToUser(
      userId,
      "Processing Progress",
      "Video processing is 50% complete",
      "info",
      { videoId, progress: 50 },
    );

    await generateThumbnails(videoId);
    await sendNotificationToUser(
      userId,
      "Processing Progress",
      "Video processing is 90% complete",
      "info",
      { videoId, progress: 90 },
    );

    // Job completed
    await sendNotificationToUser(
      userId,
      "Processing Complete",
      "Your video has been processed successfully!",
      "success",
      { videoId, status: "completed" },
    );
  } catch (error) {
    // Job failed
    await sendNotificationToUser(
      userId,
      "Processing Failed",
      "There was an error processing your video",
      "error",
      { videoId, error: error.message },
    );
  }
}
```

#### 3. API Endpoint Integration

Send real-time updates from API endpoints:

```typescript
// src/app/api/videos/upload/route.ts
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

export async function POST(request: NextRequest) {
  const { userId, file } = await request.json();

  try {
    // Start upload
    const uploadResult = await uploadVideo(file);

    // Notify user about successful upload
    await sendNotificationToUser(
      userId,
      "Upload Successful",
      "Your video has been uploaded and is being processed",
      "success",
      {
        videoId: uploadResult.id,
        fileName: file.name,
        size: file.size,
      },
    );

    return Response.json({ success: true, videoId: uploadResult.id });
  } catch (error) {
    // Notify user about upload failure
    await sendNotificationToUser(
      userId,
      "Upload Failed",
      "There was an error uploading your video",
      "error",
      { fileName: file.name, error: error.message },
    );

    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
```

#### 4. Scheduled Job Integration

Send notifications from scheduled/cron jobs:

```typescript
// src/features/jobs/scheduled-notifications.ts
import {
  broadcastSystemUpdate,
  sendNotificationToUser,
} from "@/features/sse/utils/sse-utils";

export async function sendDailyDigest() {
  // Send system-wide daily digest
  await broadcastSystemUpdate(
    "Daily Digest: Check out today's new features and updates!",
    "update",
    {
      date: new Date().toISOString().split("T")[0],
      features: ["new_upload_form", "improved_search"],
    },
  );
}

export async function sendSubscriptionReminders() {
  const expiringSubscriptions = await getExpiringSubscriptions();

  for (const subscription of expiringSubscriptions) {
    await sendNotificationToUser(
      subscription.userId,
      "Subscription Expiring",
      `Your subscription expires in ${subscription.daysUntilExpiry} days`,
      "warning",
      {
        subscriptionId: subscription.id,
        expiryDate: subscription.expiryDate,
        daysUntilExpiry: subscription.daysUntilExpiry,
      },
    );
  }
}
```

#### 5. Error Handling Integration

Send real-time error notifications:

```typescript
// src/features/error-handling/error-notifier.ts
import {
  sendNotificationToUser,
  broadcastSystemUpdate,
} from "@/features/sse/utils/sse-utils";

export async function notifyUserError(
  userId: string,
  error: Error,
  context: string,
) {
  await sendNotificationToUser(
    userId,
    "Something went wrong",
    "We encountered an error. Our team has been notified.",
    "error",
    {
      errorId: generateErrorId(),
      context,
      timestamp: Date.now(),
    },
  );
}

export async function notifySystemError(
  error: Error,
  severity: "low" | "medium" | "high",
) {
  if (severity === "high") {
    // Broadcast to all users for critical system issues
    await broadcastSystemUpdate(
      "We're experiencing technical difficulties. Please try again later.",
      "maintenance",
      {
        errorId: generateErrorId(),
        severity,
        timestamp: Date.now(),
      },
    );
  }
}
```

### Best Practices

#### 1. Error Handling

Always handle errors when sending SSE messages:

```typescript
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

async function sendUserUpdate(userId: string, data: any) {
  try {
    const sentCount = await sendNotificationToUser(
      userId,
      "Profile Updated",
      "Your profile has been updated successfully",
      "success",
    );

    console.log(
      `Notification sent to ${sentCount} client(s) for user ${userId}`,
    );
  } catch (error) {
    console.error(`Failed to send notification to user ${userId}:`, error);
    // Handle error appropriately (log, retry, fallback, etc.)
  }
}
```

#### 2. Message Structure

Use consistent message structures for better client-side handling:

```typescript
// Standard notification structure
const notificationData = {
  title: "Event Title",
  message: "Event description",
  type: "info" | "success" | "warning" | "error",
  timestamp: Date.now(),
  metadata: {
    // Additional context-specific data
    entityId: "123",
    action: "created",
    userId: "user456",
  },
};

await sendNotificationToUser(userId, "notification", notificationData);
```

#### 3. Rate Limiting

Implement rate limiting for SSE message sending to prevent abuse:

```typescript
import { rateLimit } from "@/lib/rate-limit";
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

const sseRateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

async function sendRateLimitedNotification(userId: string, message: string) {
  const { success } = await sseRateLimiter.limit(userId);

  if (!success) {
    throw new Error("Rate limit exceeded for SSE notifications");
  }

  return sendNotificationToUser(userId, "Rate Limited", message, "warning");
}
```

#### 4. Message Batching

For high-volume scenarios, consider batching messages:

```typescript
import { sendSSEMessageToUser } from "@/features/sse/utils/sse-utils";

async function sendBatchNotifications(userIds: string[], message: string) {
  const promises = userIds.map((userId) =>
    sendSSEMessageToUser(userId, "batch_notification", {
      message,
      batchId: generateBatchId(),
      timestamp: Date.now(),
    }),
  );

  const results = await Promise.allSettled(promises);

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`Batch notification: ${successful} sent, ${failed} failed`);
}
```

#### 5. Monitoring and Logging

Implement comprehensive monitoring for SSE usage:

```typescript
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

async function sendMonitoredNotification(
  userId: string,
  title: string,
  message: string,
) {
  const startTime = Date.now();

  try {
    const sentCount = await sendNotificationToUser(
      userId,
      title,
      message,
      "info",
    );

    // Log successful delivery
    console.log(`SSE notification sent`, {
      userId,
      title,
      sentCount,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return sentCount;
  } catch (error) {
    // Log failed delivery
    console.error(`SSE notification failed`, {
      userId,
      title,
      error: error.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}
```

### Testing Backend Integration

#### Unit Testing

```typescript
// src/features/sse/__tests__/sse-utils.test.ts
import {
  broadcastSSEMessage,
  sendNotificationToUser,
} from "@/features/sse/utils/sse-utils";

describe("SSE Utils", () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn();
  });

  it("should broadcast message successfully", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ sentCount: 5 }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await broadcastSSEMessage("test", { message: "Hello" });

    expect(result).toBe(5);
    expect(global.fetch).toHaveBeenCalledWith("/api/sse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "test",
        data: { message: "Hello" },
        target: "all",
      }),
    });
  });

  it("should handle broadcast errors gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const result = await broadcastSSEMessage("test", { message: "Hello" });

    expect(result).toBe(0);
  });
});
```

#### Integration Testing

```typescript
// src/features/sse/__tests__/integration.test.ts
import { createServer } from "http";
import { sendNotificationToUser } from "@/features/sse/utils/sse-utils";

describe("SSE Integration", () => {
  let server: any;

  beforeAll(async () => {
    // Start test server with SSE endpoint
    server = createServer((req, res) => {
      if (req.url === "/api/sse" && req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sentCount: 1 }));
      }
    });

    await new Promise((resolve) => server.listen(3001, resolve));
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("should send notification through API", async () => {
    const result = await sendNotificationToUser(
      "test-user",
      "Test Notification",
      "This is a test",
      "info",
    );

    expect(result).toBe(1);
  });
});
```

### Performance Considerations

#### 1. Connection Limits

Monitor and limit the number of active connections:

```typescript
import { sseManager } from "@/features/sse/services/sse-manager";

// Check connection limits before sending
const stats = sseManager.getStats();
if (stats.activeConnections > 1000) {
  console.warn("High number of SSE connections:", stats.activeConnections);
}
```

#### 2. Message Size

Keep messages small to minimize bandwidth usage:

```typescript
// Good: Small, focused message
await sendNotificationToUser(userId, "Update", "Profile saved", "success");

// Avoid: Large payloads
await sendNotificationToUser(userId, "Update", "Profile saved", "success", {
  // Don't include large objects in SSE messages
  fullUserProfile: {
    /* large object */
  },
});
```

#### 3. Message Frequency

Limit message frequency to prevent overwhelming clients:

```typescript
import { debounce } from "lodash";

// Debounce frequent updates
const debouncedNotification = debounce(
  (userId: string, message: string) =>
    sendNotificationToUser(userId, "Update", message, "info"),
  1000, // Wait 1 second between messages
);
```

This comprehensive backend integration guide provides everything needed to effectively use SSE in your backend services, with practical examples, best practices, and testing strategies.

## Usage Examples

### Client-Side (React)

#### Basic SSE Connection

```tsx
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { isConnected, clientId, lastMessage } = useSSE({
    onConnect: (id) => console.log("Connected:", id),
    onMessage: (event) => console.log("Received:", event),
  });

  return (
    <div>
      Status: {isConnected ? "Connected" : "Disconnected"}
      {lastMessage && <pre>{JSON.stringify(lastMessage, null, 2)}</pre>}
    </div>
  );
}
```

#### Listening to Specific Events

```tsx
import { useSSEEvent } from "@/features/sse";

function NotificationListener() {
  useSSEEvent("notification", (data) => {
    // Handle notification data
    showToast(data.message);
  });

  return <div>Listening for notifications...</div>;
}
```

#### Using Notifications Hook

```tsx
import { useSSENotifications } from "@/features/sse";

function NotificationCenter() {
  const { notifications, clearNotifications } = useSSENotifications();

  return (
    <div>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}
      <button onClick={clearNotifications}>Clear All</button>
    </div>
  );
}
```

### Server-Side (Backend)

#### Broadcasting Messages

```ts
import { broadcastSSEMessage } from "@/features/sse";

// Send to all connected clients
await broadcastSSEMessage("system_update", {
  message: "System maintenance in 5 minutes",
  type: "warning",
});
```

#### User-Specific Notifications

```ts
import { sendNotificationToUser } from "@/features/sse";

// Send notification to specific user
await sendNotificationToUser(
  "user123",
  "Upload Complete",
  "Your video has been processed successfully",
  "success",
);
```

#### Session-Based Messaging

```ts
import { sendSSEMessageToSession } from "@/features/sse";

// Send to all clients of a specific session
await sendSSEMessageToSession('session456', 'data_update', {
  userId: 'user123',
  newData: { ... }
});
```

#### Integration with Webhooks

```ts
import { sendNotificationToUser } from "@/features/sse";

// In Mux webhook handler
export async function POST(request: NextRequest) {
  const event = await processWebhook(request);

  if (event.type === "video.asset.ready") {
    await sendNotificationToUser(
      event.data.userId,
      "Video Ready",
      "Your video is now available for playback",
      "success",
    );
  }
}
```

## Features

### Connection Management

- **Automatic Reconnection**: Clients automatically reconnect on connection loss
- **Connection Limits**: Configurable max reconnection attempts
- **Heartbeat**: Regular ping messages to keep connections alive
- **Cleanup**: Automatic cleanup of dead connections

### Message Targeting

- **Broadcast**: Send to all connected clients
- **User-Specific**: Send to all clients of a specific user
- **Session-Specific**: Send to all clients of a specific session
- **Client-Specific**: Send to a specific client

### Event Types

- **Connected**: Sent when client successfully connects
- **Notification**: Standard notification messages
- **System Update**: System-wide announcements
- **Custom Events**: Any custom event type supported

### Error Handling

- **Connection Errors**: Automatic retry with exponential backoff
- **Message Errors**: Graceful handling of malformed messages
- **Resource Cleanup**: Proper cleanup on errors and disconnects

## Configuration

### Heartbeat Settings

```ts
// In sse-manager.ts
private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
private readonly CLIENT_TIMEOUT = 120000; // 2 minutes
```

### Reconnection Settings

```tsx
// In useSSE hook
const { isConnected } = useSSE({
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 5,
});
```

## Security Considerations

- **Authentication**: SSE connections respect user authentication
- **Session Validation**: Messages are scoped to valid sessions
- **Rate Limiting**: Consider implementing rate limiting for message sending
- **CORS**: Proper CORS headers for cross-origin requests

## Performance Considerations

- **Connection Limits**: Monitor active connections to prevent resource exhaustion
- **Message Size**: Keep messages small to minimize bandwidth usage
- **Heartbeat Frequency**: Balance between connection health and server load
- **Memory Management**: Regular cleanup of disconnected clients

## Monitoring

### SSE Manager Statistics

```ts
import { sseManager } from "@/features/sse";

const stats = sseManager.getStats();
console.log("Active connections:", stats.activeConnections);
console.log("Connections by user:", stats.connectionsByUser);
```

### Logging

The SSE manager includes comprehensive logging for:

- Connection events (connect/disconnect)
- Message delivery
- Error scenarios
- Heartbeat operations

## Testing

### Manual Testing

1. Open multiple browser tabs/windows
2. Connect to SSE endpoint
3. Send test messages using the demo component
4. Verify message delivery across all clients

### Automated Testing

```ts
// Test SSE connection
const response = await fetch("/api/sse");
expect(response.headers.get("content-type")).toBe("text/event-stream");

// Test message sending
const messageResponse = await fetch("/api/sse", {
  method: "POST",
  body: JSON.stringify({
    event: "test",
    data: { message: "Hello" },
    target: "all",
  }),
});
expect(messageResponse.status).toBe(200);
```

## Troubleshooting

### Common Issues

1. **Connection Not Establishing**
   - Check if SSE endpoint is accessible
   - Verify authentication is working
   - Check browser console for errors

2. **Messages Not Received**
   - Verify client is connected (check `isConnected` state)
   - Check message format and target parameters
   - Review server logs for delivery errors

3. **High Memory Usage**
   - Monitor active connections with `sseManager.getStats()`
   - Check for proper cleanup of disconnected clients
   - Review heartbeat settings

4. **Reconnection Issues**
   - Verify `maxReconnectAttempts` and `reconnectInterval` settings
   - Check network connectivity
   - Review error handling in `onError` callback

## Future Enhancements

- **Message Persistence**: Store undelivered messages for offline users
- **Message Queuing**: Queue messages when client is disconnected
- **Message Filtering**: Allow clients to subscribe to specific event types
- **Load Balancing**: Support for multiple SSE server instances
- **Analytics**: Track message delivery and engagement metrics
