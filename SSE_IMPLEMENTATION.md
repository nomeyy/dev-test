# SSE Implementation Documentation

## Overview

Simple Server-Sent Events (SSE) implementation for real-time notifications.

## Features Implemented ✅

### ✅ Acceptance Criteria Met:

- [x] SSE endpoint implemented (`/api/sse`)
- [x] Clients can subscribe and receive events
- [x] Server can send events to individual/multiple clients
- [x] Heartbeat/ping mechanism (15-second intervals)
- [x] Client disconnect cleanup
- [x] Error handling and logging
- [x] Mock UI for testing (`/sse-demo`)

## Usage

### Server-Side (Send Events)

```typescript
// Send to all clients
await fetch("/api/sse", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    target: "all",
    event: "notification",
    data: { message: "Hello everyone!" },
  }),
});

// Send to specific user
await fetch("/api/sse", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    target: "user",
    targetId: "user123",
    event: "user_update",
    data: { profile: "updated" },
  }),
});
```

### Client-Side (Receive Events)

```typescript
import { useSSE } from "@/hooks/useSSE";

function MyComponent() {
  const { events, lastEvent, isConnected, sendEvent } = useSSE();

  // Handle new events
  useEffect(() => {
    if (lastEvent?.event === "notification") {
      console.log("New notification:", lastEvent.data);
    }
  }, [lastEvent]);
}
```

## API Endpoints

### GET `/api/sse`

- Establishes SSE connection
- Sends initial "connected" event
- Starts heartbeat (every 15 seconds)
- Handles client disconnect cleanup

### POST `/api/sse`

- Send events to connected clients
- Requires authentication
- Supports targeting: `all`, `user`, `client`

## Testing

Visit `/sse-demo` to test the SSE functionality with a simple UI.

## Architecture

- **Simple in-memory storage** for client connections
- **Automatic heartbeat** to keep connections alive
- **Clean disconnect handling** to prevent memory leaks
- **React hook** for easy client integration
