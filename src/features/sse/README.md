# SSE (Server-Sent Events) Feature

This feature provides a centralized, reusable Server-Sent Events layer that enables real-time server-to-client notifications across the application.

## Quick Start

### Basic Usage

```typescript
import { sseService } from "@/features/sse";

// Notify a specific user
await sseService.notifyUser("user123", "notification", {
  title: "New Message",
  body: "You have received a new message",
  timestamp: new Date().toISOString(),
});

// Notify all users in a session
await sseService.notifySession("session456", "session-update", {
  type: "user-joined",
  user: { id: "user789", name: "John Doe" },
});

// Broadcast to all connected clients
await sseService.broadcastEvent("system-announcement", {
  message: "System maintenance scheduled for tonight",
  severity: "info",
});
```

### Advanced Usage

```typescript
import {
  SSEService,
  SSEServiceError,
  SSEServiceErrorCode,
} from "@/features/sse";

// Create custom service instance
const customSSEService = new SSEService();

// Send custom events with full control
try {
  const success = await customSSEService.sendCustomEvent(
    { type: "user", id: "user123" },
    {
      id: "custom-event-id",
      event: "custom-notification",
      data: { custom: "payload" },
      retry: 5000,
    },
  );

  if (success) {
    console.log("Event sent successfully");
  }
} catch (error) {
  if (error instanceof SSEServiceError) {
    console.error(`SSE Error [${error.code}]: ${error.message}`);
    console.error("Details:", error.details);
  }
}
```

## API Reference

### SSEService Methods

#### `notifyUser(userId: string, eventName: string, payload: any): Promise<boolean>`

Send a notification to a specific user.

- **userId**: The ID of the user to notify
- **eventName**: Name of the event (alphanumeric, underscores, and hyphens only)
- **payload**: Any serializable data to send
- **Returns**: Promise that resolves to `true` if sent successfully
- **Throws**: `SSEServiceError` if user not found or validation fails

#### `notifySession(sessionId: string, eventName: string, payload: any): Promise<boolean>`

Send a notification to all connections in a session.

- **sessionId**: The ID of the session to notify
- **eventName**: Name of the event
- **payload**: Any serializable data to send
- **Returns**: Promise that resolves to `true` if sent successfully
- **Throws**: `SSEServiceError` if session not found or validation fails

#### `broadcastEvent(eventName: string, payload: any): Promise<number>`

Broadcast an event to all connected clients.

- **eventName**: Name of the event
- **payload**: Any serializable data to send
- **Returns**: Promise that resolves to the number of clients the event was sent to

#### `sendCustomEvent(target: SSETarget, event: SSEEvent): Promise<boolean>`

Send a custom event with full control over the event structure.

- **target**: Target specification (`{ type: 'user' | 'session' | 'client' | 'broadcast', id?: string }`)
- **event**: Custom SSE event object
- **Returns**: Promise that resolves to `true` if sent successfully

## Error Handling

The SSE service provides comprehensive error handling with descriptive error codes:

```typescript
import { SSEServiceError, SSEServiceErrorCode } from "@/features/sse";

try {
  await sseService.notifyUser("", "test", {});
} catch (error) {
  if (error instanceof SSEServiceError) {
    switch (error.code) {
      case SSEServiceErrorCode.INVALID_EVENT_NAME:
        console.error("Invalid event name provided");
        break;
      case SSEServiceErrorCode.INVALID_TARGET:
        console.error("Invalid target specification");
        break;
      case SSEServiceErrorCode.TARGET_NOT_FOUND:
        console.error("Target user/session not connected");
        break;
      case SSEServiceErrorCode.SERIALIZATION_ERROR:
        console.error("Payload cannot be serialized");
        break;
      case SSEServiceErrorCode.CONNECTION_ERROR:
        console.error("Connection or network error");
        break;
    }
  }
}
```

## Event Format

Events sent through the SSE service are automatically formatted with metadata:

```typescript
{
  id: "evt_1234567890_abc123def",
  event: "notification",
  data: {
    type: "notification",
    timestamp: "2023-12-07T10:30:00.000Z",
    data: {
      // Your payload here
    },
    metadata: {
      source: "sse-service",
      version: "1.0.0",
      correlationId: "corr_1234567890_xyz789"
    }
  },
  retry: 3000
}
```

## Client-Side Usage

Connect to the SSE endpoint from your client application:

```typescript
// Client-side JavaScript
const eventSource = new EventSource("/api/sse");

eventSource.addEventListener("notification", (event) => {
  const data = JSON.parse(event.data);
  console.log("Received notification:", data);
});

eventSource.addEventListener("session-update", (event) => {
  const data = JSON.parse(event.data);
  console.log("Session update:", data);
});

eventSource.onerror = (error) => {
  console.error("SSE connection error:", error);
};
```

## Integration Examples

### With tRPC Procedures

```typescript
// In your tRPC router
import { sseService } from "@/features/sse";

export const notificationRouter = router({
  sendNotification: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await sseService.notifyUser(input.userId, "notification", {
        message: input.message,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    }),
});
```

### With Server Actions

```typescript
// In your server action
import { sseService } from "@/features/sse";

export async function createPost(formData: FormData) {
  // Create post logic...

  // Notify followers
  await sseService.broadcastEvent("new-post", {
    postId: newPost.id,
    author: newPost.author,
    title: newPost.title,
  });
}
```

## Architecture

The SSE service is built on top of several components:

- **SSEService**: High-level API for sending events
- **SSEConnectionManager**: Manages active connections and event dispatching
- **HeartbeatManager**: Keeps connections alive with periodic pings
- **ConnectionStore**: Redis-backed storage for connection metadata
- **API Route**: `/api/sse` endpoint for client connections

## Configuration

The SSE service uses sensible defaults but can be configured:

```typescript
import { SSEService, SSEConnectionManager } from "@/features/sse";

const customManager = new SSEConnectionManager(
  undefined, // Use default connection store
  {
    interval: 15000, // 15 second heartbeat
    timeout: 30000, // 30 second timeout
    maxMissedPings: 2,
  },
);

const customService = new SSEService(customManager);
```
