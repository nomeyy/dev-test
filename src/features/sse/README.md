# SSE (Server-Sent Events) Module

A comprehensive Server-Sent Events implementation for real-time communication in Next.js applications. This module provides both server-side and client-side utilities for managing SSE connections, broadcasting messages, and handling real-time updates.

## Features

- **User Targeting**: Send messages to specific users or broadcast to all clients
- **Client Management**: Automatic client tracking, cleanup, and connection monitoring
- **Type Safety**: Full TypeScript support with Zod validation schemas
- **tRPC Integration**: Seamless integration with tRPC for type-safe subscriptions
- **Connection Monitoring**: Real-time connection status and message tracking

## API Reference

### Hooks

#### `useSSESubscription(options?)`

React hook for managing SSE connections.

**Parameters:**

- `options` (optional): `ClientSSEConnectionOptions`
  - `userId?: string` - User identifier for targeted messages
  - `sessionId?: string` - Session identifier
  - `onMessage?: (message: ClientSSEMessage) => void` - Message handler
  - `onConnect?: () => void` - Connection established handler
  - `onDisconnect?: () => void` - Connection closed handler
  - `onError?: (error: Error) => void` - Error handler

**Returns:**

```typescript
{
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: ClientSSEMessage | null;
  messageCount: number;
  connect: () => void;
  disconnect: () => void;
  subscription: any; // tRPC subscription object
}
```

### Server Utilities

#### `sendUserNotification(userId, event, data)`

Send a notification to a specific user.

```typescript
await sendUserNotification("user123", "notification", {
  title: "New Message",
  message: "You have a new message from John",
  type: "info",
});
```

#### `broadcastMessage(event, data, exclude?)`

Broadcast a message to all connected clients.

```typescript
await broadcastMessage(
  "system",
  {
    message: "System maintenance in 5 minutes",
    type: "warning",
  },
  ["client1", "client2"],
); // Optional exclude list
```

#### `sendToClients(clientIds, event, data)`

Send a message to specific clients by their IDs.

```typescript
await sendToClients(["client1", "client2"], "update", {
  status: "ready",
});
```

#### `getClientCount()`

Get the current number of connected clients.

```typescript
const count = getClientCount();
console.log(`Currently ${count} clients connected`);
```

#### `getActiveClients()`

Get information about all active clients.

```typescript
const clients = getActiveClients();
console.log(
  "Active clients:",
  clients.map((c) => ({ id: c.id, userId: c.userId })),
);
```

### Components

#### `SSEView`

A demo component for testing SSE functionality.

```typescript
import { SSEView } from '@features/sse';

function DemoPage() {
  return <SSEView userId="user123" />;
}
```

## Advanced Usage

### Custom Event Handlers

```typescript
const { isConnected, lastMessage } = useSSESubscription({
  userId: "user123",
  onMessage: (message) => {
    switch (message.event) {
      case "notification":
        showNotification(message.data);
        break;
      case "update":
        updateUI(message.data);
        break;
      case "alert":
        showAlert(message.data);
        break;
    }
  },
  onConnect: () => {
    console.log("SSE connection established");
  },
  onDisconnect: () => {
    console.log("SSE connection lost");
  },
  onError: (error) => {
    console.error("SSE error:", error);
  },
});
```

### Manual Connection Control

```typescript
const { isConnected, connect, disconnect } = useSSESubscription({
  onConnect: () => console.log("Connected!"),
  onDisconnect: () => console.log("Disconnected!"),
});

// Manual connection management
const handleConnect = () => {
  if (!isConnected) {
    connect();
  }
};

const handleDisconnect = () => {
  if (isConnected) {
    disconnect();
  }
};
```

### tRPC Integration (FOR DEMO PURPOSES)

The module includes tRPC procedures for testing and direct message sending:

```typescript
// In your tRPC client
const sendTestMessageMutation = api.sse.sendTestMessage.useMutation();

// Send a test message
await sendTestMessageMutation.mutateAsync({
  type: "broadcast", // or 'user'
  event: "notification",
  data: {
    title: "Test Message",
    message: "This is a test message",
    type: "info",
  },
  userId: "user123", // required for user type
});
```

## Configuration

### SSE Service Configuration

The SSE service uses the following default configuration:

```typescript
const SSE_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  MAX_IDLE_TIME_MS: 300000, // 5 minutes
  CLEANUP_INTERVAL_MS: 60000, // 1 minute
};
```
