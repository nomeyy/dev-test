# Server-Sent Events (SSE) System

This document describes the Server-Sent Events (SSE) implementation for real-time, server-to-client notifications.

## Overview

The SSE system provides a centralized way to send real-time updates from the server to connected clients. It includes:

- **Server-side SSE Manager**: Handles client connections, event dispatching, and connection lifecycle
- **Client-side Utilities**: React hooks and utilities for connecting to SSE streams
- **API Endpoints**: RESTful endpoints for sending messages and getting statistics
- **Demo UI**: Interactive demonstration of SSE functionality

## Architecture

### Server-Side Components

1. **SSEManager** (`src/lib/sse/server.ts`)
   - Singleton class managing all client connections
   - Handles event broadcasting and targeted messaging
   - Maintains connection statistics
   - Implements heartbeat mechanism

2. **SSE API Endpoints**
   - `/api/sse` - Main SSE connection endpoint
   - `/api/sse/test` - Test message sending endpoint
   - `/api/sse/stats` - Statistics and monitoring endpoint

### Client-Side Components

1. **SSE Client** (`src/lib/sse/client.ts`)
   - EventSource wrapper with reconnection logic
   - Event listener management
   - Error handling and retry mechanisms

2. **React Hook** (`src/hooks/useSSE.tsx`)
   - React hook for easy SSE integration
   - Automatic connection management
   - State management for connection status and messages

## Usage

### Basic Client Connection

```typescript
import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { isConnected, lastMessage, connect, disconnect } = useSSE();

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Last message: {JSON.stringify(lastMessage)}</p>
    </div>
  );
}
```

### Advanced Client Connection

```typescript
import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { isConnected, clientId, lastMessage, lastEvent } = useSSE({
    userId: 'user123',
    sessionId: 'session456',
    onConnect: (connection) => {
      console.log('Connected with ID:', connection.clientId);
    },
    onDisconnect: () => {
      console.log('Disconnected');
    },
    onError: (error) => {
      console.error('SSE Error:', error);
    },
  });

  return (
    <div>
      <p>Client ID: {clientId}</p>
      <p>Last Event: {lastEvent}</p>
      <p>Last Message: {JSON.stringify(lastMessage)}</p>
    </div>
  );
}
```

### Server-Side Message Sending

```typescript
import { broadcastSSE, sendSSEToUser, sendSSEMessage } from "@/lib/sse/server";

// Broadcast to all clients
broadcastSSE("notification", {
  message: "Hello everyone!",
  timestamp: new Date().toISOString(),
});

// Send to specific user
sendSSEToUser("user123", "user-notification", {
  message: "Hello user!",
  userId: "user123",
});

// Send with target specification
sendSSEMessage({
  event: "custom-event",
  data: { message: "Custom message" },
  target: "session",
  targetId: "session456",
});
```

### Webhook Integration Example

```typescript
// In a webhook handler
export async function POST(request: Request) {
  const webhookData = await request.json();

  // Process webhook data
  const result = await processWebhook(webhookData);

  // Send notification to relevant users
  if (result.userId) {
    sendSSEToUser(result.userId, "webhook-processed", {
      status: "success",
      data: result,
      timestamp: new Date().toISOString(),
    });
  }

  return new Response("OK");
}
```

## API Reference

### Server-Side Functions

#### `broadcastSSE(event: string, data: any): number`

Broadcasts a message to all connected clients.

- Returns: Number of clients that received the message

#### `sendSSEToUser(userId: string, event: string, data: any): number`

Sends a message to all clients of a specific user.

- Returns: Number of clients that received the message

#### `sendSSEToSession(sessionId: string, event: string, data: any): number`

Sends a message to all clients of a specific session.

- Returns: Number of clients that received the message

#### `sendSSEToClient(clientId: string, event: string, data: any): boolean`

Sends a message to a specific client.

- Returns: Boolean indicating success

#### `sendSSEMessage(message: SSEMessage): number`

Sends a message with target specification.

- Returns: Number of clients that received the message

### Client-Side Hook

#### `useSSE(options?: SSEOptions): UseSSEReturn`

**Options:**

- `userId?: string` - User ID for targeted messaging
- `sessionId?: string` - Session ID for targeted messaging
- `clientId?: string` - Specific client ID
- `onConnect?: (connection: SSEConnection) => void` - Connection callback
- `onDisconnect?: () => void` - Disconnection callback
- `onError?: (error: Event) => void` - Error callback
- `onMessage?: (event: SSEEvent) => void` - Message callback
- `retryInterval?: number` - Retry interval in milliseconds (default: 5000)
- `maxRetries?: number` - Maximum retry attempts (default: 5)

**Returns:**

- `isConnected: boolean` - Connection status
- `clientId: string | null` - Current client ID
- `lastMessage: any | null` - Last received message
- `lastEvent: string | null` - Last received event type
- `connect: () => Promise<void>` - Connect function
- `disconnect: () => void` - Disconnect function
- `sendTestMessage: () => void` - Send test message function

## API Endpoints

### GET `/api/sse`

Establishes an SSE connection.
**Query Parameters:**

- `userId` - User ID for targeted messaging
- `sessionId` - Session ID for targeted messaging
- `clientId` - Specific client ID

### POST `/api/sse/test`

Sends a test message.
**Body:**

```json
{
  "event": "test-event",
  "data": { "message": "Hello" },
  "target": "all|user|session|client",
  "targetId": "id"
}
```

### GET `/api/sse/test`

Sends a test broadcast message to all clients.

### GET `/api/sse/stats`

Returns SSE statistics and connected clients information.

## Features

### Connection Management

- Automatic client registration and cleanup
- Connection status tracking
- Graceful disconnection handling

### Event Targeting

- **Broadcast**: Send to all connected clients
- **User-specific**: Send to all clients of a specific user
- **Session-specific**: Send to all clients of a specific session
- **Client-specific**: Send to a specific client

### Reliability

- Automatic reconnection with exponential backoff
- Heartbeat mechanism to keep connections alive
- Error handling and logging
- Resource cleanup on disconnect

### Monitoring

- Real-time statistics
- Connected client tracking
- Event delivery confirmation

### Performance

- Efficient event dispatching
- Memory leak prevention
- Scalable connection management

## Best Practices

1. **Connection Management**
   - Always disconnect when components unmount
   - Use appropriate retry intervals for your use case
   - Handle connection errors gracefully

2. **Event Design**
   - Use descriptive event names
   - Keep event payloads small and focused
   - Include timestamps for time-sensitive data

3. **Targeting**
   - Use user-specific messaging for personal notifications
   - Use session-specific messaging for temporary data
   - Use broadcast sparingly to avoid unnecessary traffic

4. **Error Handling**
   - Implement proper error callbacks
   - Log errors for debugging
   - Provide fallback mechanisms

5. **Security**
   - Validate user permissions before sending targeted messages
   - Sanitize message content
   - Implement rate limiting if needed

## Troubleshooting

### Common Issues

1. **Connection not established**
   - Check if the SSE endpoint is accessible
   - Verify CORS settings
   - Check browser console for errors

2. **Messages not received**
   - Verify event names match between sender and receiver
   - Check if client is properly connected
   - Ensure message format is correct

3. **Memory leaks**
   - Ensure proper cleanup in React components
   - Check for event listener leaks
   - Monitor connection statistics

4. **Performance issues**
   - Limit broadcast frequency
   - Use targeted messaging when possible
   - Monitor connection count and resource usage

## Examples

See the `SSEDemo` component in `src/components/SSEDemo.tsx` for a complete working example of the SSE system.
