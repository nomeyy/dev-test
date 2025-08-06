# Server-Sent Events (SSE) Feature

This feature provides a centralized SSE manager for real-time, server-to-client notifications across the app.

## Features

- ✅ Centralized SSE manager to track active client connections
- ✅ Send named events with payloads to specific clients or broadcast to multiple clients
- ✅ Handle client connection lifecycle (connect, disconnect, errors)
- ✅ Heartbeat/ping mechanism to keep connections alive
- ✅ Clean up client connections properly on disconnect or errors
- ✅ React hook for easy client-side integration
- ✅ Utility functions for backend services to send notifications
- ✅ Simple demo UI to test functionality

## API Endpoints

### SSE Connection

- `GET /api/sse` - Establish SSE connection
- Query parameters: `userId`, `sessionId` (optional)

### Send Messages

- `POST /api/sse/send` - Send SSE message to clients
- `GET /api/sse/send` - Get connection status

## Usage

### Client-Side (React)

```tsx
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { isConnected, lastMessage, error } = useSSE({
    userId: "user123",
    onMessage: (event) => {
      console.log("Received SSE message:", event);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastMessage && <p>Last message: {JSON.stringify(lastMessage.data)}</p>}
    </div>
  );
}
```

### Backend Services

```typescript
import {
  sendNotification,
  broadcastMessage,
  sendUserMessage,
} from "@/features/sse";

// Send notification to all clients
await sendNotification("Hello", "This is a test notification", "info");

// Broadcast custom event
await broadcastMessage("user-updated", {
  userId: "123",
  action: "profile-updated",
});

// Send message to specific user
await sendUserMessage("user123", "private-message", {
  message: "This is private",
});
```

### Webhook Integration

```typescript
// In a webhook handler
import { sendNotification } from "@/features/sse";

export async function POST(request: NextRequest) {
  const data = await request.json();

  // Notify all connected clients about the webhook
  await sendNotification(
    "Webhook Received",
    `New data received: ${data.type}`,
    "info",
  );

  return NextResponse.json({ success: true });
}
```

## Demo

Visit `/sse-demo` to see a working example of the SSE functionality.

## Architecture

### SSE Manager

- Manages client connections in memory
- Handles message routing and broadcasting
- Implements heartbeat mechanism
- Cleans up stale connections

### Client Management

- Each client has a unique ID
- Supports user-specific and session-specific connections
- Automatic cleanup on disconnect

### Message Format

SSE messages follow the standard format:

```
id: {message-id}
event: {event-name}
data: {json-data}

```

## Configuration

- Heartbeat interval: 30 seconds
- Client timeout: 2 minutes
- Auto-reconnection on client side
- Error handling and logging

## Security Considerations

- SSE connections are stateless
- No authentication required for demo purposes
- In production, consider adding authentication middleware
- Rate limiting may be needed for the send endpoint
