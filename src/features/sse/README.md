# SSE (Server-Sent Events) Feature

This feature provides a complete Server-Sent Events implementation for real-time, server-to-client notifications across the app.

## Features

- ✅ **Centralized SSE Manager**: Tracks active client connections
- ✅ **Event Broadcasting**: Send events to specific clients, users, or broadcast to all
- ✅ **Connection Lifecycle**: Handles connect, disconnect, and error states
- ✅ **Heartbeat Mechanism**: Keeps connections alive with ping messages
- ✅ **Resource Cleanup**: Proper cleanup on disconnect to prevent leaks
- ✅ **React Integration**: Hooks and context providers for easy frontend usage
- ✅ **Backend Utilities**: Service functions for sending events from other parts of the app

## Backend Integration Guide

### Quick Start

```typescript
import { sseManager } from "@/features/sse";

sseManager.sendToUser("user123", {
  event: "notification",
  data: { message: "Your reel is ready!", type: "success" },
});

sseManager.sendToClient("client_1234567890_abc123", {
  event: "reel-update",
  data: { reelId: "reel456", status: "processing" },
});

sseManager.broadcast({
  event: "system-message",
  data: { message: "System maintenance in 5 minutes" },
});
```

### API Reference

#### SSE Manager Methods

```typescript
interface SSEManager {
  sendToClient(clientId: string, event: SSEEvent): void;

  sendToUser(userId: string, event: SSEEvent): void;

  broadcast(event: SSEEvent): void;

  getClientCount(): number;

  clients: Map<string, SSEClient>;
}
```

#### Event Structure

```typescript
interface SSEEvent {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
}
```

### Integration Examples

#### 1. Webhook Handlers

```typescript
// src/app/api/webhooks/mux/route.ts
import { sseManager } from "@/features/sse";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, reelId, status } = body;

  // Process webhook...

  // Send real-time update to user
  sseManager.sendToUser(userId, {
    event: "reel-update",
    data: {
      reelId,
      status,
      timestamp: Date.now(),
    },
  });

  return Response.json({ success: true });
}
```

#### 2. Background Job Processors

```typescript
import { sseManager } from "@/features/sse";

export async function processReelUpload(userId: string, reelId: string) {
  sseManager.sendToUser(userId, {
    event: "reel-update",
    data: { reelId, status: "processing", progress: 0 },
  });

  for (let progress = 0; progress <= 100; progress += 10) {
    await processChunk();

    sseManager.sendToUser(userId, {
      event: "reel-update",
      data: { reelId, status: "processing", progress },
    });
  }

  sseManager.sendToUser(userId, {
    event: "reel-update",
    data: { reelId, status: "completed", progress: 100 },
  });
}
```

#### 3. Authentication Events

```typescript
import { sseManager } from "@/features/sse";

export async function handleUserLogin(userId: string) {
  sseManager.sendToUser(userId, {
    event: "auth-event",
    data: {
      type: "login",
      timestamp: Date.now(),
      location: "New York, NY",
    },
  });
}

export async function handleUserLogout(userId: string) {
  sseManager.sendToUser(userId, {
    event: "auth-event",
    data: {
      type: "logout",
      timestamp: Date.now(),
    },
  });
}
```

#### 4. System Notifications

```typescript
import { sseManager } from "@/features/sse";

export class NotificationService {
  static sendNotification(
    userId: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) {
    sseManager.sendToUser(userId, {
      event: "notification",
      data: {
        message,
        type,
        timestamp: Date.now(),
        id: generateId(),
      },
    });
  }

  static broadcastAnnouncement(
    message: string,
    priority: "low" | "medium" | "high",
  ) {
    sseManager.broadcast({
      event: "system-announcement",
      data: {
        message,
        priority,
        timestamp: Date.now(),
      },
    });
  }

  static notifyMaintenance(startTime: Date, duration: number) {
    sseManager.broadcast({
      event: "maintenance-notice",
      data: {
        startTime: startTime.toISOString(),
        duration,
        message: `Scheduled maintenance starting at ${startTime.toLocaleString()}`,
      },
    });
  }
}
```

#### 5. Real-time Search Updates

```typescript
import { sseManager } from "@/features/sse";

export class SearchService {
  static async updateSearchIndex(userId: string) {
    sseManager.sendToUser(userId, {
      event: "search-update",
      data: { status: "indexing", progress: 0 },
    });

    const totalItems = await getTotalItems();
    let processed = 0;

    for (const batch of getBatches()) {
      await processBatch(batch);
      processed += batch.length;

      const progress = Math.round((processed / totalItems) * 100);
      sseManager.sendToUser(userId, {
        event: "search-update",
        data: { status: "indexing", progress },
      });
    }

    // Complete
    sseManager.sendToUser(userId, {
      event: "search-update",
      data: { status: "completed", progress: 100 },
    });
  }
}
```

### Error Handling

```typescript
import { sseManager } from "@/features/sse";

export async function sendEventWithRetry(
  userId: string,
  event: SSEEvent,
  maxRetries = 3,
) {
  try {
    sseManager.sendToUser(userId, event);
  } catch (error) {
    console.error("Failed to send SSE event:", error);

    // Log for monitoring
    await logError("sse_send_failed", {
      userId,
      event: event.event,
      error: error.message,
    });

    if (maxRetries > 0) {
      setTimeout(() => {
        sendEventWithRetry(userId, event, maxRetries - 1);
      }, 1000);
    }
  }
}
```

### Monitoring and Debugging

```typescript
// Monitor SSE connections
setInterval(() => {
  const clientCount = sseManager.getClientCount();
  console.log(`Active SSE clients: ${clientCount}`);

  await logMetric("sse_active_clients", clientCount);
}, 60000); // Every minute

function debugClient(clientId: string) {
  const client = sseManager.clients.get(clientId);
  if (client) {
    console.log("Client info:", {
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
    });
  }
}
```

### Best Practices

#### 1. **Event Naming Convention**

```typescript
const EVENTS = {
  NOTIFICATION: "notification",
  REEL_UPDATE: "reel-update",
  AUTH_EVENT: "auth-event",
  SYSTEM_MESSAGE: "system-message",
  SEARCH_UPDATE: "search-update",
} as const;
```

#### 2. **Data Validation**

```typescript
import { z } from "zod";

const NotificationSchema = z.object({
  message: z.string(),
  type: z.enum(["info", "success", "warning", "error"]),
  timestamp: z.number(),
  id: z.string().optional(),
});

export function sendValidatedNotification(userId: string, data: unknown) {
  const validated = NotificationSchema.parse(data);
  sseManager.sendToUser(userId, {
    event: "notification",
    data: validated,
  });
}
```

#### 3. **Rate Limiting**

```typescript
import { rateLimiter } from "@/lib/rate-limit";

export async function sendRateLimitedEvent(userId: string, event: SSEEvent) {
  const key = `sse:${userId}`;
  const result = await rateLimiter.limit(key);

  if (result.success) {
    sseManager.sendToUser(userId, event);
  } else {
    console.warn(`Rate limited SSE event for user ${userId}`);
  }
}
```

#### 4. **Connection Management**

```typescript
export function sendToUserIfConnected(userId: string, event: SSEEvent) {
  const hasConnections = Array.from(sseManager.clients.values()).some(
    (client) => client.userId === userId,
  );

  if (hasConnections) {
    sseManager.sendToUser(userId, event);
  } else {
    sendEmailNotification(userId, event);
  }
}
```

### Testing Backend Integration

```typescript
import { sseManager } from "@/features/sse";

describe("SSE Backend Integration", () => {
  beforeEach(() => {
    sseManager.clients.clear();
  });

  it("should send events to specific users", () => {
    // Mock client
    const mockClient = {
      id: "test-client",
      userId: "test-user",
      sessionId: "test-session",
      send: jest.fn(),
      close: jest.fn(),
    };

    sseManager.addClient(mockClient);

    const event = {
      event: "test",
      data: { message: "Hello" },
    };

    sseManager.sendToUser("test-user", event);

    expect(mockClient.send).toHaveBeenCalledWith(event);
  });
});
```

## API Endpoints

### GET `/api/sse`

Establishes SSE connection with optional query parameters:

- `userId`: Associate connection with a specific user
- `sessionId`: Associate connection with a session

### POST `/api/sse/test`

Sends test SSE events for testing purposes.

## React Components

### SSEProvider

Context provider that manages SSE connection state.

```tsx
import { SSEProvider } from "@/features/sse";

function App() {
  return (
    <SSEProvider userId="user123">
      <YourApp />
    </SSEProvider>
  );
}
```

### useSSEContext

Hook to access SSE state and controls.

```tsx
import { useSSEContext } from "@/features/sse";

function MyComponent() {
  const { isConnected, lastEvent, events, connect, disconnect } =
    useSSEContext();

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastEvent && <p>Last: {JSON.stringify(lastEvent)}</p>}
    </div>
  );
}
```

### SSETestUI

Complete test interface with connection controls and event display.

### SSEMessageDisplay

Simple component that displays the latest SSE message.

## Event Types

### Built-in Events

- `connect`: Sent when client connects
- `ping`: Heartbeat messages (every 30 seconds)
- `notification`: User notifications
- `reel-update`: Reel processing updates
- `system-message`: Broadcast system messages

### Custom Events

You can send any custom event with any data structure.

## Testing

Visit `/sse-test` to see the SSE functionality in action:

- Connect/disconnect controls
- Send test events
- View real-time event stream
- Simple message display

## Architecture

```
src/features/sse/
├── components/          # React components
│   ├── SSEProvider.tsx # Context provider
│   ├── SSETestUI.tsx   # Test interface
│   └── SSEMessageDisplay.tsx # Simple display
├── hooks/              # React hooks
│   └── useSSE.tsx      # SSE connection hook
├── services/           # Backend services
│   ├── sse-manager.ts  # Core SSE manager
│   └── sse-service.ts  # Utility service
├── types/              # TypeScript types
│   └── index.ts        # SSE interfaces
└── index.ts            # Public exports
```

## Usage Examples

### Basic Usage

```tsx
import { SSEProvider, SSEMessageDisplay } from "@/features/sse";

function App() {
  return (
    <SSEProvider>
      <SSEMessageDisplay />
    </SSEProvider>
  );
}
```

### Advanced Usage

```tsx
import { useSSEContext } from "@/features/sse";

function NotificationCenter() {
  const { events } = useSSEContext();

  return (
    <div>
      {events.map((event, index) => (
        <div key={index}>
          {event.event}: {JSON.stringify(event.data)}
        </div>
      ))}
    </div>
  );
}
```

### Backend Integration

```typescript
export async function handleReelUpload(userId: string, reelId: string) {
  // Process upload...
  SSEService.sendReelUpdate(userId, reelId, "processing");

  // After processing...
  SSEService.sendReelUpdate(userId, reelId, "completed");
}
```
