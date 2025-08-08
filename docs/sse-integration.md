# SSE (Server-Sent Events) Integration Guide

## Overview

This document outlines the Server-Sent Events (SSE) system used for real-time, server-to-client notifications. The system manages client connections, dispatches events, and provides a simple API for backend use.

## Key Features

- **Centralized Manager**: Tracks all active client connections.
- **Event Dispatch**: Sends named events with JSON payloads to specific clients or broadcasts to all.
- **Connection Lifecycle**: Handles connect, disconnect, and error states automatically.
- **Heartbeat**: Keeps connections alive with a periodic ping.
- **Resource Cleanup**: Ensures disconnected clients are cleaned up to prevent memory leaks.
- **Logging**: Provides logs for connection events, errors, and debugging.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   SSE Manager   │    │   Backend       │
│   (Browser)     │◄──►│   (lib/sse.ts)  │◄──►│   (API Routes)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### 1. Subscribe to SSE Stream

```
GET /api/sse/subscribe/{clientId}
```

**Headers:**

- `Content-Type: text/event-stream; charset=utf-8`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

**Response:** Server-Sent Events stream

### 2. Send Notifications

```
POST /api/sse/notify
```

## How to Run and Test

To test the SSE functionality, you will need to have two browser tabs open: one for the client and one for the admin dashboard.

1.  **Start the development server**:

    ```bash
    npm run dev
    ```

2.  **Open the Client Page**:
    - Navigate to `http://localhost:3000/client`.
    - Enter a name and click "Join" to connect to the SSE stream.

3.  **Open the Admin Dashboard**:
    - In a separate tab, navigate to `http://localhost:3000/admin`.
    - You should see the connected client appear in the "Connected Clients" list.

4.  **Send a Notification**:
    - On the admin page, type a message in the "Send Notification" section.
    - You can either select a specific client or choose to broadcast to all clients.
    - Click "Send Notification".

5.  **Verify on the Client Page**:
    - Switch back to the client tab. You should see the notification you just sent appear in real-time.

**Request Body:**

```json
{
  "clientId": "user-123", // Optional if broadcast=true
  "event": "notification", // Event name
  "payload": { "message": "..." }, // JSON payload
  "broadcast": false // Send to all clients if true
}
```

**Response:**

```json
{
  "ok": true,
  "sent": true,
  "clientId": "user-123",
  "connections": 5
}
```

### 3. Get Connection Metrics

```
GET /api/sse/metrics
```

**Response:**

```json
{
  "totalConnections": 10,
  "totalClients": 3,
  "averageConnectionsPerClient": 3.33
}
```

## Backend Integration

### Basic Usage

```typescript
import { sendEvent, broadcast, totalConnections } from "@/lib/sse";

// Send to specific client
sendEvent("user-123", "notification", {
  message: "Hello!",
  timestamp: Date.now(),
});

// Broadcast to all clients
broadcast("system-alert", {
  level: "warning",
  message: "Maintenance in 5 minutes",
  timestamp: Date.now(),
});

// Get connection count
const activeConnections = totalConnections();
```

### Webhook Integration Example

```typescript
// In your webhook handler
export async function POST(request: Request) {
  const body = await request.json();

  // Process webhook data
  const { userId, eventType, data } = body;

  // Send notification to user
  if (userId) {
    sendEvent(userId, eventType, data);
  }

  // Or broadcast system-wide
  if (eventType === "system-maintenance") {
    broadcast("maintenance-alert", data);
  }

  return NextResponse.json({ ok: true });
}
```

### Job Processor Integration

```typescript
// In your job processor
export async function processJob(jobData: any) {
  try {
    // Process the job
    const result = await processJobData(jobData);

    // Notify user about job completion
    sendEvent(jobData.userId, "job-completed", {
      jobId: jobData.id,
      status: "completed",
      result,
    });
  } catch (error) {
    // Notify user about job failure
    sendEvent(jobData.userId, "job-failed", {
      jobId: jobData.id,
      status: "failed",
      error: error.message,
    });
  }
}
```

## Client-Side Integration

### Basic EventSource Setup

```typescript
const eventSource = new EventSource("/api/sse/subscribe/user-123");

eventSource.addEventListener("notification", (e) => {
  const data = JSON.parse(e.data);
  console.log("Received notification:", data);
});

eventSource.addEventListener("__connected", (e) => {
  const data = JSON.parse(e.data);
  console.log("Connected to SSE:", data);
});

eventSource.addEventListener("__heartbeat", (e) => {
  // Heartbeat received - connection is alive
  console.log("Heartbeat received");
});

eventSource.onerror = (error) => {
  console.error("SSE connection error:", error);
  // EventSource auto-reconnects by default
};
```

### React Hook Example

```typescript
import { useEffect, useState } from "react";

export function useSSE(clientId: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sse/subscribe/${clientId}`);

    eventSource.addEventListener("__connected", () => {
      setIsConnected(true);
    });

    eventSource.addEventListener("notification", (e) => {
      const data = JSON.parse(e.data);
      setEvents((prev) => [...prev, data]);
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [clientId]);

  return { events, isConnected };
}
```

## Event Types

### System Events

- `__connected`: Sent when client successfully connects
- `__heartbeat`: Periodic ping to keep connection alive

### Custom Events

You can send any named events with JSON payloads:

- `notification`: General notifications
- `system-alert`: System-wide alerts
- `maintenance`: Maintenance notifications
- `job-completed`: Job completion notifications
- `user-update`: User-specific updates

## Error Handling

### Server-Side Errors

- Automatic cleanup of dead connections
- Logging of connection events and errors
- Graceful handling of write failures

### Client-Side Errors

- EventSource auto-reconnection
- Error event handling
- Connection status monitoring

## Monitoring & Debugging

### Connection Metrics

```typescript
import { getConnectionMetrics, getConnectedClients } from "@/lib/sse";

// Get detailed metrics
const metrics = getConnectionMetrics();
console.log("Active connections:", metrics.totalConnections);
console.log("Unique clients:", metrics.totalClients);

// Get list of connected clients
const clients = getConnectedClients();
console.log("Connected clients:", clients);
```

### Logging

The SSE system logs important events:

- Client connections/disconnections
- Event sending attempts
- Broadcast operations
- Heartbeat cleanup operations

## Production Considerations

### Scaling

- **Current**: In-memory storage (single instance only)
- **Production**: Use Redis pub/sub for multi-instance support

### Security

- Add authentication to SSE endpoints
- Implement rate limiting
- Add CORS configuration for cross-origin requests

### Performance

- Monitor connection count and memory usage
- Implement connection limits per client
- Consider connection pooling for high-traffic scenarios

## Testing

To test the system, use the Client and Admin pages:

- **Client Page (`/client`)**: Connects to the SSE stream and displays received notifications.
- **Admin Dashboard (`/admin`)**: View connected clients and send notifications.

Refer to the "How to Run and Test" section for detailed steps.

## Troubleshooting

### Common Issues

1. **Client not receiving events**
   - Check if client is properly connected
   - Verify event names match between sender and receiver
   - Check browser console for errors

2. **Memory leaks**
   - Ensure proper cleanup in useEffect hooks
   - Monitor connection count via metrics endpoint

3. **Connection timeouts**
   - Heartbeat mechanism should prevent this
   - Check network configuration for proxy timeouts

### Debug Commands

```typescript
// Check if client has connections
import { hasClientConnections } from "@/lib/sse";
const hasConnections = hasClientConnections("user-123");

// Get all connected clients
import { getConnectedClients } from "@/lib/sse";
const clients = getConnectedClients();
```
