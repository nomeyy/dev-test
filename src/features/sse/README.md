# Server-Sent Events (SSE) Manager

A centralized SSE manager for handling real-time communication between the server and clients.

## Features

### ✅ Implemented

- **Track active client connections** - Maintains a map of all connected clients with unique IDs
- **Send named events with payloads** - Support for sending events to specific clients, users, or broadcasting to all
- **Handle client connection lifecycle** - Proper connect/disconnect handling with cleanup
- **Provide API/utility functions** - Clean utility functions for backend modules to send notifications
- **Heartbeat/ping messages** - Automatic ping every 30 seconds to keep connections alive
- **Clean up client connections** - Automatic cleanup of stale/inactive connections
- **Error handling & recovery** - Error counting and automatic disconnection of problematic clients
- **Connection limits** - Maximum 1000 concurrent connections
- **Resource management** - Proper cleanup of controller references and streams
- **Connection state tracking** - Track connection status, activity, and error counts

### 🔧 Architecture

```
SSE Manager
├── Client Tracking (Map<string, SSEClient>)
├── Event Broadcasting
│   ├── sendToClient()
│   ├── sendToUser()
│   └── broadcast()
├── Connection Management
│   ├── addClient()
│   ├── removeClient()
│   └── cleanup()
├── Heartbeat System
│   ├── Automatic ping (30s intervals)
│   └── Stale connection detection (5min)
└── Utility Functions
    ├── sendNotification()
    ├── sendSystemUpdate()
    └── Error handling
```

## Usage

### Basic Setup

```typescript
import { getSSEManager, sendNotification, broadcast } from "@/features/sse";

// Get the SSE manager instance
const sseManager = getSSEManager();

// Send a notification to a specific user
await sendNotification(
  "user123",
  "Welcome!",
  "You have successfully connected",
  "success",
);

// Broadcast a system update to all clients
await broadcast("system_update", {
  message: "Server maintenance in 5 minutes",
});
```

### Client Connection

Clients connect via the `/api/sse` endpoint:

```javascript
// Client-side JavaScript
const eventSource = new EventSource("/api/sse");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

eventSource.addEventListener("notification", (event) => {
  const notification = JSON.parse(event.data);
  console.log("Notification:", notification);
});

eventSource.addEventListener("ping", (event) => {
  console.log("Ping received");
});
```

### API Endpoints

#### GET `/api/sse`

Establishes an SSE connection. Returns a stream of events.

#### POST `/api/sse/test-notification`

Send a test notification to a specific client.

```json
{
  "clientId": "client_1234567890_abc123",
  "title": "Test Title",
  "message": "Test message"
}
```

### Utility Functions

#### `sendToClient(clientId, event, data)`

Send an event to a specific client.

```typescript
await sendToClient("client_123", "custom_event", {
  message: "Hello client!",
});
```

#### `sendToUser(userId, event, data)`

Send an event to all clients of a specific user.

```typescript
await sendToUser("user123", "notification", {
  title: "New Message",
  message: "You have a new message",
  type: "info",
});
```

#### `broadcast(event, data)`

Broadcast an event to all connected clients.

```typescript
await broadcast("system_update", {
  message: "Server will restart in 5 minutes",
  timestamp: Date.now(),
});
```

#### `sendNotification(userId, title, message, type)`

Send a formatted notification to a user.

```typescript
await sendNotification("user123", "Welcome!", "Login successful", "success");
```

#### `sendSystemUpdate(update, details)`

Send a system update to all clients.

```typescript
await sendSystemUpdate("Maintenance scheduled", {
  startTime: "2024-01-01T00:00:00Z",
  duration: "30 minutes",
});
```

### Connection Management

#### Check Client Status

```typescript
import { isClientConnected, getClientById } from "@/features/sse";

const isConnected = isClientConnected("client_123");
const clientInfo = getClientById("client_123");
```

#### Get Connection Statistics

```typescript
import { getClientCount, getClientsByUserId } from "@/features/sse";

const totalClients = getClientCount();
const userClients = getClientsByUserId("user123");
```

## Configuration

### Connection Limits

- Maximum concurrent connections: 1000
- Maximum errors per client: 5
- Heartbeat interval: 30 seconds
- Stale connection threshold: 5 minutes
- Inactive connection threshold: 10 minutes

### Headers

The SSE endpoint sets the following headers:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Connection: keep-alive`
- `X-Accel-Buffering: no` (disables nginx buffering)

## Error Handling

The SSE manager includes comprehensive error handling:

1. **Connection Errors**: Clients with too many errors are automatically disconnected
2. **Stale Connections**: Inactive connections are cleaned up automatically
3. **Resource Leaks**: Proper cleanup of controllers and streams
4. **Graceful Degradation**: Failed sends don't crash the system

## Event Types

### Built-in Events

- `connect` - Sent when client connects
- `disconnect` - Sent when client disconnects
- `notification` - User notifications
- `system_update` - System-wide updates
- `ping` - Heartbeat messages
- `error` - Error messages
- `reconnect` - Reconnection requests

### Custom Events

You can send any custom event type:

```typescript
await sendToClient("client_123", "user_activity", {
  userId: "user123",
  action: "page_view",
  timestamp: Date.now(),
});
```

## Integration Examples

### Webhook Handler

```typescript
// In a webhook handler
import { sendNotification } from "@/features/sse";

export async function handlePaymentWebhook(paymentData) {
  // Process payment
  const userId = paymentData.userId;

  // Send real-time notification
  await sendNotification(
    userId,
    "Payment Successful",
    "Your payment has been processed",
    "success",
  );
}
```

### Job Processor

```typescript
// In a background job
import { broadcast } from "@/features/sse";

export async function processBatchJob() {
  // Process batch
  await broadcast("job_complete", {
    jobId: "batch_123",
    status: "completed",
    processedItems: 1000,
  });
}
```

## Monitoring

The SSE manager logs important events:

- Client connections/disconnections
- Event delivery status
- Error counts and disconnections
- Cleanup operations

Monitor these logs to track SSE health and performance.
