# SSE Backend Integration Guide

This document provides comprehensive backend integration instructions for the Server-Sent Events (SSE) feature based on the actual implementation.

## Core Architecture

The SSE backend consists of three main components:

1. **SSE Manager** (`SSEManager`): Singleton class that manages client connections and message dispatching
2. **SSE Service** (`getSSEManager`): Service function that provides access to the SSE manager instance
3. **API Route** (`/api/sse`): Next.js API route that establishes SSE connections

## API Route Implementation

The SSE connection is established through the `/api/sse` route:

```typescript
// src/app/api/sse/route.ts
import { getSSEManager } from "@/features/sse";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const stream = new TransformStream();
  const writer =
    stream.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
  const sseManager = getSSEManager();

  sseManager.connectClient({ writer: writer, clientId: clientId! });
  req.signal.addEventListener("abort", () => {
    sseManager.disconnectClient(clientId!);
    void writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Key Implementation Details:

- **Client ID**: Required as a URL parameter (`?clientId=<uuid>`)
- **TransformStream**: Creates a writable stream for sending SSE messages
- **Connection Management**: Automatically handles client connection and disconnection
- **Headers**: Sets proper SSE headers for browser compatibility

## SSE Manager Configuration

The SSE manager is configured with the following default settings:

```typescript
// src/features/sse/services/sse-service.ts
import { SSEManager } from "./sse-manager";

export const getSSEManager = () => {
  return SSEManager.getInstance({
    heartbeatInterval: 10000, // 10 seconds
    cleanupInterval: 30000, // 30 seconds
  });
};
```

### Configuration Options:

- **heartbeatInterval**: Interval for sending keep-alive messages (default: 10 seconds)
- **cleanupInterval**: Interval for cleaning up disconnected clients (default: 30 seconds)

## Core Types

```typescript
// src/features/sse/types/index.ts

export interface SSEEvent {
  id?: string;
  event: string;
  data: unknown;
  retry?: number;
}

export interface SSEClient {
  id: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  isConnected: boolean;
}

export interface SSEMessagePayload {
  clientId?: string;
  target: "all" | "user";
  message: string;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number;
  cleanupInterval?: number;
}
```

## Backend Integration Methods

### 1. Getting SSE Manager Instance

```typescript
import { getSSEManager } from "@/features/sse";

const sseManager = getSSEManager();
```

### 2. Sending Messages

#### Send to All Connected Clients

```typescript
const sseManager = getSSEManager();

sseManager.sendMessage({
  target: "all",
  message: JSON.stringify({
    event: "broadcast",
    data: { message: "Hello everyone!" },
  }),
});
```

#### Send to Specific User

```typescript
const sseManager = getSSEManager();

sseManager.sendMessage({
  clientId: "user123",
  target: "user",
  message: JSON.stringify({
    event: "private_message",
    data: { message: "Hello user!" },
  }),
});
```

### 3. Client Management

#### Get Active Clients

```typescript
const sseManager = getSSEManager();
const activeClients = sseManager.getActiveClients();
console.log("Active clients:", activeClients.length);
```

#### Manual Cleanup

```typescript
const sseManager = getSSEManager();
await sseManager.cleanupDisconnectedClients();
```

## tRPC Integration

The SSE feature includes tRPC routes for sending messages:

```typescript
// src/features/sse/trpc/route.ts
import { publicProcedure, createTRPCRouter } from "@/lib/trpc";
import { getSSEManager } from "../services/sse-service";
import { z } from "zod";

const sseManager = getSSEManager();

export const sseRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(z.object({ message: z.string(), clientId: z.string() }))
    .mutation(({ input }) => {
      const { clientId, message } = input;
      sseManager.sendMessage({ clientId, message, target: "user" });
      return { ok: true, sent: [clientId] };
    }),
  broadcastMessage: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(({ input }) => {
      const { message } = input;
      sseManager.sendMessage({ message, target: "all" });
    }),
  activeClients: publicProcedure.query(() => {
    return sseManager.getActiveClients();
  }),
});
```

### Available tRPC Procedures:

- **sendMessage**: Send a message to a specific client
- **broadcastMessage**: Send a message to all connected clients
- **activeClients**: Get list of active client connections

## Message Format

SSE messages follow the standard Server-Sent Events format:

```
event: <event_type>
data: <json_data>

```

### Example Message Structure:

```typescript
// Message sent to client
{
  event: "user_joined",
  data: {
    userId: "123",
    username: "john"
  }
}
```

## Error Handling

### Connection Errors

The SSE manager automatically handles connection errors:

```typescript
// Automatic error handling in SSEManager
private writeMessage(client: SSEClient, event: string, messageData: string) {
  try {
    void client.writer.write(new TextEncoder().encode(`event: ${event}\ndata: ${messageData}\n\n`));
  } catch (error) {
    this.logger.error('Error writing message to client', {
      clientId: client.id,
      event,
      error: error instanceof Error ? error.message : String(error)
    });

    // Mark client as disconnected on write error
    this.disconnectClient(client.id);
  }
}
```

### Client Disconnection

Clients are automatically marked as disconnected when:

- The connection is aborted (browser closes tab/window)
- A write error occurs
- Manual disconnection is called

## Logging

The SSE manager includes comprehensive logging:

```typescript
// Log levels and information
this.logger.info("Client connected", {
  clientId: payload.clientId,
  totalClients: this.clients.size,
  activeClients: this.getActiveClients().length,
});

this.logger.debug("Sending message", {
  clientId,
  target,
  messageLength: message.length,
  activeClients: this.getActiveClients().length,
});

this.logger.warn("Attempted to send message to inactive client", { clientId });

this.logger.error("Error writing message to client", {
  clientId: client.id,
  event,
  error: error instanceof Error ? error.message : String(error),
});
```

## Performance Considerations

### Memory Management

- **Automatic Cleanup**: Disconnected clients are automatically cleaned up every 30 seconds
- **Connection Tracking**: Only active connections are maintained in memory
- **Stream Management**: Proper stream closure prevents memory leaks

### Scalability

- **Singleton Pattern**: Single SSE manager instance across the application
- **Client Limits**: No hard limit on concurrent connections (configurable)
- **Heartbeat System**: Keeps connections alive and detects disconnections

## Security Considerations

- **Client ID Validation**: Each client must provide a unique client ID
- **Connection State**: Proper tracking of connection state prevents unauthorized access
- **Error Isolation**: Client errors don't affect other connections

## Integration Examples

### Real-time Notifications

```typescript
// Send notification when user receives a message
const sseManager = getSSEManager();

const notification = {
  event: "new_message",
  data: {
    sender: "john",
    message: "Hello!",
    timestamp: Date.now(),
  },
};

sseManager.sendMessage({
  clientId: userId,
  target: "user",
  message: JSON.stringify(notification),
});
```

### System Broadcasts

```typescript
// Broadcast system maintenance notification
const sseManager = getSSEManager();

const maintenanceNotice = {
  event: "system_maintenance",
  data: {
    message: "System will be down for maintenance in 5 minutes",
    scheduledTime: "2024-01-01T12:00:00Z",
  },
};

sseManager.sendMessage({
  target: "all",
  message: JSON.stringify(maintenanceNotice),
});
```

### Live Updates

```typescript
// Send live data updates
const sseManager = getSSEManager();

const dataUpdate = {
  event: "data_update",
  data: {
    entity: "users",
    action: "updated",
    payload: {
      id: "123",
      name: "John Doe",
      status: "online",
    },
  },
};

sseManager.sendMessage({
  target: "all",
  message: JSON.stringify(dataUpdate),
});
```

## Troubleshooting

### Common Issues

1. **Client not receiving messages**
   - Verify client ID is correct
   - Check if client is connected (`isConnected: true`)
   - Ensure proper JSON formatting in message

2. **Memory leaks**
   - Monitor active client count
   - Check cleanup interval is running
   - Verify proper stream closure

3. **Connection drops**
   - Check heartbeat interval
   - Monitor network connectivity
   - Verify SSE headers are set correctly

### Debug Information

The SSE manager provides detailed logging for debugging:

- Client connection/disconnection events
- Message sending operations
- Heartbeat operations
- Cleanup processes
- Error conditions with context
