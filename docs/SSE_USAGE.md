# Server-Sent Events (SSE) Implementation Guide

## Overview

This SSE implementation provides a reusable, abstracted layer for real-time server-to-client notifications. It includes a centralized connection manager, API endpoints for sending events, and a complete client interface.

## Architecture

### Core Components

1. **SSEConnectionManager** (`src/features/sse/server/SSEConnectionManager.ts`)
   - Centralized manager for all SSE connections
   - Handles client lifecycle (connect, disconnect, errors)
   - Manages heartbeat/ping messages
   - Provides clean interface for event dispatching

2. **API Endpoints**
   - `GET /api/sse?clientId=<id>` - Client connection endpoint
   - `POST /api/sse/send` - Send events to specific clients
   - `POST /api/sse/broadcast` - Broadcast events to all clients

3. **Client Components**
   - `SSETestPanel` - Example React component for testing
   - Event handling and display UI

## Usage Examples

### Backend Integration

#### 1. Send Event to Specific Client

```typescript
import { sseConnectionManager } from "@/features/sse/server/SSEConnectionManager";

// Send a notification to a specific user
sseConnectionManager.sendEvent("user123", "notification", {
  title: "New Message",
  body: "You have a new message from John",
  timestamp: new Date().toISOString(),
});
```

#### 2. Broadcast to All Connected Clients

```typescript
// Broadcast system-wide announcement
sseConnectionManager.sendEvent("broadcast", "system-announcement", {
  type: "maintenance",
  message: "Scheduled maintenance in 30 minutes",
  severity: "warning",
});
```

#### 3. Using API Endpoints

**Send to specific client:**

```bash
curl -X POST http://localhost:3000/api/sse/send \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "user123",
    "event": "order-update",
    "data": {
      "orderId": "ORD-456",
      "status": "shipped",
      "trackingNumber": "TRK123456"
    }
  }'
```

**Broadcast to all clients:**

```bash
curl -X POST http://localhost:3000/api/sse/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "event": "global-notification",
    "data": {
      "message": "New feature released!",
      "type": "info"
    }
  }'
```

#### 4. Integration in Webhook Handlers

```typescript
// In a webhook handler or job processor
export async function POST(request: NextRequest) {
  const webhookData = await request.json();

  // Process webhook...

  // Send real-time update to affected user
  sseConnectionManager.sendEvent(webhookData.userId, "webhook-update", {
    source: "payment-processor",
    status: webhookData.status,
    amount: webhookData.amount,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
```

#### 5. Job Queue Integration

```typescript
// In a background job processor
async function processJob(job: Job) {
  try {
    // Process the job...

    // Send progress updates
    sseConnectionManager.sendEvent(job.userId, "job-progress", {
      jobId: job.id,
      progress: 50,
      message: "Processing...",
    });

    // Complete the job...

    // Send completion notification
    sseConnectionManager.sendEvent(job.userId, "job-complete", {
      jobId: job.id,
      result: "success",
      downloadUrl: "/api/download/123",
    });
  } catch (error) {
    // Send error notification
    sseConnectionManager.sendEvent(job.userId, "job-error", {
      jobId: job.id,
      error: error.message,
    });
  }
}
```

### Frontend Integration

#### Basic React Hook

```tsx
import { useEffect, useState } from "react";

interface SSEMessage {
  event: string;
  data: any;
  timestamp: string;
}

export function useSSE(clientId: string) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | "disconnected"
  >("disconnected");

  useEffect(() => {
    if (!clientId) return;

    setConnectionStatus("connecting");
    const eventSource = new EventSource(`/api/sse?clientId=${clientId}`);

    eventSource.onopen = () => {
      setConnectionStatus("connected");
    };

    eventSource.onerror = () => {
      setConnectionStatus("error");
    };

    // Listen for any event type
    eventSource.addEventListener("notification", (event) => {
      setMessages((prev) => [
        ...prev,
        {
          event: "notification",
          data: JSON.parse(event.data),
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    eventSource.addEventListener("order-update", (event) => {
      setMessages((prev) => [
        ...prev,
        {
          event: "order-update",
          data: JSON.parse(event.data),
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    return () => {
      eventSource.close();
      setConnectionStatus("disconnected");
    };
  }, [clientId]);

  return { messages, connectionStatus };
}
```

#### Component Usage

```tsx
export function NotificationCenter({ userId }: { userId: string }) {
  const { messages, connectionStatus } = useSSE(userId);

  return (
    <div className="notification-center">
      <div className="status">Status: {connectionStatus}</div>

      {messages.map((message, index) => (
        <div key={index} className="notification">
          <strong>{message.event}</strong>
          <pre>{JSON.stringify(message.data, null, 2)}</pre>
          <small>{message.timestamp}</small>
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### SSEConnectionManager Methods

#### `sendEvent(target: string, event: string, data: object)`

Send an event to a specific client or broadcast to all clients.

- `target`: Client ID or "broadcast" for all clients
- `event`: Event name (string)
- `data`: Event payload (object)

#### `getTotalConnectionCount(): number`

Get the total number of active connections.

#### `getClientConnectionCount(clientId: string): number`

Get the number of active connections for a specific client.

#### `getActiveClients(): string[]`

Get array of all active client IDs.

### API Endpoints

#### `GET /api/sse?clientId=<id>`

Establish SSE connection for a client.

- **Query Parameters**: `clientId` (required)
- **Response**: SSE stream with proper headers

#### `POST /api/sse/send`

Send event to specific client.

- **Body**: `{ clientId: string, event: string, data: object }`
- **Response**: `{ success: boolean, message: string, ... }`

#### `POST /api/sse/broadcast`

Broadcast event to all clients.

- **Body**: `{ event: string, data: object }`
- **Response**: `{ success: boolean, recipients: number, ... }`

## Testing

Visit `/sse-example` to test the SSE functionality with the provided UI components.

The test panel will:

1. Automatically connect to the SSE endpoint
2. Display connection status
3. Show real-time messages.
4. Handle disconnections gracefully
