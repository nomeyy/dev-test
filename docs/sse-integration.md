# Server-Sent Events (SSE) Integration

## Introduction

This repository provides a Server-Sent Events (SSE) system for real-time, server-to-client notifications. It includes a centralized manager for client connections, event dispatching, and a simple API for backend integration. This README offers a concise guide to understanding, running, and testing the SSE system as outlined in `sse-integration.md`.

## Features

- **Centralized Connection Management**: Tracks all active client connections.
- **Event Dispatching**: Sends named events with JSON payloads to specific clients or broadcasts to all.
- **Connection Lifecycle Management**: Automatically handles connect, disconnect, and error states.
- **Heartbeat Mechanism**: Periodic pings to maintain active connections.
- **Resource Cleanup**: Automatically removes disconnected clients to prevent memory leaks.
- **Logging**: Detailed logs for connection events, errors, and debugging.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │◄──►│   SSE Manager   │◄──►│   Backend       │
│   (Browser)     │    │   (lib/sse.ts)  │    │   (API Routes)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

The system connects clients (browsers) to a backend via an SSE manager implemented in `lib/sse.ts`, which handles communication through defined API routes.

## Prerequisites

- Node.js and npm installed.
- A modern web browser for testing client and admin interfaces.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd <project-directory>
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. **Start the Development Server**:

   ```bash
   npm run dev
   ```

2. **Access the Client Interface**:
   - Open `http://localhost:3000/client` in a browser.
   - Enter a name and click "Join" to connect to the SSE stream.

3. **Access the Admin Dashboard**:
   - In another browser tab, open `http://localhost:3000/admin`.
   - View connected clients in the "Connected Clients" list.

4. **Send Notifications**:
   - In the admin dashboard, enter a message in the "Send Notification" section.
   - Select a specific client or broadcast to all clients.
   - Click "Send Notification" and verify the message appears in real-time on the client page.

## API Endpoints

### Subscribe to SSE Stream

- **Endpoint**: `GET /api/sse/subscribe/{clientId}`
- **Headers**:
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
- **Response**: SSE stream delivering real-time events.

### Send Notifications

- **Endpoint**: `POST /api/sse/notify`
- **Request Body**:
  ```json
  {
    "clientId": "user-123", // Optional if broadcast=true
    "event": "notification", // Event name
    "payload": { "message": "..." }, // JSON payload
    "broadcast": false // Send to all clients if true
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "sent": true,
    "clientId": "user-123",
    "connections": 5
  }
  ```

### Connection Metrics

- **Endpoint**: `GET /api/sse/metrics`
- **Response**:
  ```json
  {
    "totalConnections": 10,
    "totalClients": 3,
    "averageConnectionsPerClient": 3.33
  }
  ```

## Backend Integration Examples

### Sending Events

```typescript
import { sendEvent, broadcast, totalConnections } from "@/lib/sse";

// Send to a specific client
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

### Webhook Handler

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, eventType, data } = body;

  if (userId) {
    sendEvent(userId, eventType, data);
  }

  if (eventType === "system-maintenance") {
    broadcast("maintenance-alert", data);
  }

  return NextResponse.json({ ok: true });
}
```

### Job Processor

```typescript
export async function processJob(jobData: any) {
  try {
    const result = await processJobData(jobData);
    sendEvent(jobData.userId, "job-completed", {
      jobId: jobData.id,
      status: "completed",
      result,
    });
  } catch (error) {
    sendEvent(jobData.userId, "job-failed", {
      jobId: jobData.id,
      status: "failed",
      error: error.message,
    });
  }
}
```

## Client-Side Integration

### EventSource Setup

```typescript
const eventSource = new EventSource("/api/sse/subscribe/user-123");

eventSource.addEventListener("notification", (e) => {
  const data = JSON.parse(e.data);
  console.log("Received notification:", data);
});

eventSource.addEventListener("__connected", (e) => {
  console.log("Connected to SSE:", JSON.parse(e.data));
});

eventSource.addEventListener("__heartbeat", () => {
  console.log("Heartbeat received");
});

eventSource.onerror = (error) => {
  console.error("SSE connection error:", error);
};
```

### React Hook

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

- **System Events**:
  - `__connected`: Triggered on successful client connection.
  - `__heartbeat`: Periodic ping to maintain connection.
- **Custom Events**:
  - `notification`: General notifications.
  - `system-alert`: System-wide alerts.
  - `maintenance`: Maintenance notifications.
  - `job-completed`: Job completion notifications.
  - `user-update`: User-specific updates.

## Error Handling

- **Server-Side**:
  - Automatic cleanup of dead connections.
  - Detailed logging of connection events and errors.
  - Graceful handling of write failures.
- **Client-Side**:
  - Automatic reconnection via EventSource.
  - Error event handling.
  - Connection status monitoring.

## Monitoring and Debugging

### Connection Metrics

```typescript
import { getConnectionMetrics, getConnectedClients } from "@/lib/sse";

const metrics = getConnectionMetrics();
console.log("Active connections:", metrics.totalConnections);
console.log("Unique clients:", metrics.totalClients);

const clients = getConnectedClients();
console.log("Connected clients:", clients);
```

### Debug Commands

```typescript
import { hasClientConnections, getConnectedClients } from "@/lib/sse";

// Check client connections
const hasConnections = hasClientConnections("user-123");

// List all connected clients
const clients = getConnectedClients();
```

## Production Considerations

- **Scaling**: Use Redis pub/sub for multi-instance support instead of in-memory storage.
- **Security**:
  - Add authentication to SSE endpoints.
  - Implement rate limiting.
  - Configure CORS for cross-origin requests.
- **Performance**:
  - Monitor connection count and memory usage.
  - Set connection limits per client.
  - Consider connection pooling for high traffic.

## Troubleshooting

### Common Issues

1. **Client Not Receiving Events**:
   - Verify client connection status.
   - Ensure event names match between sender and receiver.
   - Check browser console for errors.
2. **Memory Leaks**:
   - Ensure proper cleanup in useEffect hooks.
   - Monitor connection count via metrics endpoint.
3. **Connection Timeouts**:
   - Verify heartbeat mechanism is active.
   - Check network configuration for proxy timeouts.

## Testing

- **Client Page**: Access `/client` to connect to the SSE stream and view notifications.
- **Admin Dashboard**: Access `/admin` to view connected clients and send notifications.
- Follow the "Running the Application" section for detailed testing steps.

## Additional Notes

- The SSE manager is implemented in `lib/sse.ts`.
- Refer to `sse-integration.md` for detailed technical documentation.
- Ensure all paths (e.g., `/api/sse/subscribe/{clientId}`, `/client`, `/admin`) remain unchanged.
