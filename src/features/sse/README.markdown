# Server-Sent Events (SSE) Module

This module provides a robust Server-Sent Events (SSE) implementation for real-time notifications in the Nomey web application. It enables efficient, type-safe, and scalable communication between the server and connected clients using a modular and maintainable structure.

## Features

- **Server-Sent Events (SSE)**: Establishes persistent connections for real-time event streaming.
- **Type-Safe Events**: Uses TypeScript generics for strongly typed event payloads.
- **Automatic Reconnection**: Client-side hooks with exponential backoff for reliable reconnections.
- **Optimized Heartbeats**: Configurable ping intervals (default: 45s) to maintain connections with minimal server load.
- **Client Filtering**: Supports sending events to specific users, sessions, or clients based on metadata.
- **Structured Logging**: Comprehensive logging for debugging and monitoring connection states.
- **Scalable Architecture**: Modular design with services, hooks, utilities, components, and types for easy integration and maintenance.
- **Connection Monitoring**: Includes a `TrackConnections` component to display real-time connection statistics.
- **Demo UI**: Simple interface to test and demonstrate SSE functionality.

## Directory Structure

```
src/features/sse
├── __tests__/
│   └── event-service.test.ts
├── components/
│   └── TrackConnections.tsx
├── hooks/
│   └── use-sse.ts
├── services/
│   └── event-service.ts
├── types/
│   └── index.ts
├── utils/
│   └── notifications.ts
├── index.ts
├── package.json
└── README.md

src/app/api/sse
├── clients/
│   └── route.ts
├── test/
│   └── route.ts
└── route.ts

src/app/(protected)/home
├── error.tsx
├── page.tsx
└── SSEDemo.tsx
```

## Installation

This module is part of the Nomey web app and does not require separate installation. Ensure the project dependencies are installed via:

```bash
npm install
```

## Usage

### Initializing the Service

Initialize the SSE service in your application, typically in a server-side context (e.g., Next.js API routes or server components):

```typescript
import { initializeSSE } from "@/features/sse";

initializeSSE({
  pingInterval: 45000, // 45 seconds
  clientTimeout: 90000, // 90 seconds
  maxClients: 1000,
  enableLogging: true,
});
```

### Using the Client-Side Hook

Incorporate the `useSSE` hook in your React components to handle SSE connections:

```typescript
import { useSSE } from "@/features/sse";

function MyComponent() {
  const { isConnected, lastEvent, addEventListener } = useSSE({
    userId: "user123",
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  useEffect(() => {
    const unsubscribe = addEventListener("notification", (event) => {
      console.log("Received notification:", event.data);
    });
    return unsubscribe;
  }, [addEventListener]);

  return (
    <div>
      <p>Connection Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <pre>{JSON.stringify(lastEvent, null, 2)}</pre>
    </div>
  );
}
```

### Sending Notifications

Send notifications to specific users, filter by metadata, or broadcast to all clients:

```typescript
import { notifyUser, notifyWithMetadata, broadcast } from "@/features/sse";

// Notify a specific user
notifyUser("user123", {
  event: "notification",
  data: { message: "Hello, user!", timestamp: new Date().toISOString() },
});

// Notify clients with specific metadata
notifyWithMetadata(
  { role: "admin" },
  { event: "admin_alert", data: { message: "Admin notification" } },
);

// Broadcast to all connected clients
broadcast({
  event: "alert",
  data: { message: "System update available" },
});
```

### API Routes

- **GET /api/sse**: Establishes an SSE connection with optional query parameters (`userId`, `sessionId`, and custom metadata).
  - Example: `GET /api/sse?userId=user123&sessionId=abc123&role=admin`
- **POST /api/sse/test**: Sends a test notification to a specific user (for demo purposes).
  - Example request:
    ```bash
    curl -X POST http://localhost:3000/api/sse/test \
    -H "Content-Type: application/json" \
    -d '{"userId": "user123", "message": "Test notification"}'
    ```
- **GET /api/sse/clients**: Retrieves a list of active clients with optional filtering by `userId`, `sessionId`, or `clientIds`.
  - Example: `GET /api/sse/clients?userId=user123`

### Demo Component

A demo component (`SSEDemo.tsx`) is available on the `/home` page to test SSE functionality after signing in. It includes:

- A text input to set the `userId` for sending notifications.
- A text input for the notification message.
- A button to send test notifications.
- A display area for received messages.
- A `TrackConnections` component to show active connection statistics.

To access the demo:

1. Sign in to the Nomey web app.
2. Navigate to the `/home` page.
3. Enter a target user ID and message.
4. Click the "Send Notification" button to trigger a notification.
5. View received notifications and connection stats in the UI.

![alt text](doc/image-1.png)
![alt text](doc/image-2.png)

### Connection Monitoring

The `TrackConnections` component displays real-time statistics about active SSE connections, including:

- Total number of connected clients.
- Clients grouped by user ID.
- Average connection duration.
- Total events sent.
- Last event timestamp.

Example usage in a component:

```typescript
import { TrackConnections } from "@/features/sse";

function MyComponent() {
  return (
    <div>
      <h2>Connection Stats</h2>
      <TrackConnections />
    </div>
  );
}
```

## Configuration

The `EventService` constructor accepts a configuration object with the following options:

| Option          | Type    | Default | Description                          |
| --------------- | ------- | ------- | ------------------------------------ |
| `pingInterval`  | number  | 45000   | Heartbeat interval (ms)              |
| `clientTimeout` | number  | 90000   | Client inactivity timeout (ms)       |
| `maxClients`    | number  | 1000    | Maximum number of concurrent clients |
| `enableLogging` | boolean | true    | Enable structured logging            |

Example:

```typescript
initializeSSE({
  pingInterval: 30000,
  clientTimeout: 60000,
  maxClients: 500,
  enableLogging: false,
});
```

## Testing

Unit tests are provided in the `__tests__` directory. Run the tests using:

```bash
npm test
```

The test suite (`event-service.test.ts`) includes:

- Connection creation and validation.
- Broadcasting events to multiple clients.
- Filtering clients by user ID.
- Stale client cleanup functionality.

## Implementation Details

- **EventService**: Manages SSE connections, handles client lifecycle, and supports broadcasting and filtered notifications.
- **useSSE Hook**: Provides a client-side interface for connecting to SSE streams, handling reconnections, and processing events.
- **TrackConnections**: Fetches and displays real-time connection statistics from the `/api/sse/clients` endpoint.
- **API Routes**:
  - `/api/sse`: Creates SSE connections with support for custom metadata.
  - `/api/sse/test`: Sends test notifications for demo purposes.
  - `/api/sse/clients`: Returns active client information for monitoring.
- **Type Safety**: Uses TypeScript interfaces (`SSEClient`, `SSEEvent`, `ClientFilter`, `SSEConfig`, `SSEStats`) for robust type checking.
- **Logging**: Integrates with a custom logging utility (`@/utils/logging`) for detailed connection tracking.

## Example Workflow

1. **Server Setup**: Initialize `EventService` with desired configuration.
2. **Client Connection**: Use the `useSSE` hook in a React component to connect to `/api/sse` with a `userId`.
3. **Sending Notifications**: Use `notifyUser`, `notifyWithMetadata`, or `broadcast` to send events from the server.
4. **Monitoring**: Include `TrackConnections` to display active connections and stats.
5. **Testing**: Use the `/home` demo page or send test notifications via `/api/sse/test`.

## Limitations

- **Browser Support**: Requires modern browsers with `EventSource` support.
- **Scalability**: Limited by the `maxClients` configuration (default: 1000). For larger scale, consider horizontal scaling with a message broker (e.g., Redis).
- **Network Stability**: Relies on stable network connections; the `useSSE` hook mitigates issues with automatic reconnection.

## License

This module is licensed under the [MIT License](LICENSE).
