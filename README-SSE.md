# SSE Layer

This project includes a minimal, reusable Server-Sent Events (SSE) layer for server-to-client notifications.

## Endpoints

- `GET /api/sse?clientId=...&userId=...` — establishes an SSE stream.
- `POST /api/sse/emit` — emits an event to a specific client, user, or broadcasts.

Body shape:

```
{
  "event": "string",
  "data": any,
  "clientId?": "string",
  "userId?": "string"
}
```

If neither `clientId` nor `userId` is provided, a broadcast is sent to all open connections.

## Server helpers

Import `SseHelpers` to emit from anywhere in backend code:

```ts
import { SseHelpers } from "@/lib/sse";

// broadcast
SseHelpers.broadcast({ event: "job:update", data: { id: "123", status: "done" } });

// to a specific client
SseHelpers.emitToClient("client-123", { event: "notify", data: { message: "Hi" } });

// to a specific user (if you attach userId when connecting)
SseHelpers.emitToUser("user-42", { event: "notify", data: { unread: 3 } });
```

## Local smoke test

1. Start dev server.
2. Open `/sse-test` in the browser.
3. Click "Connect".
4. Click "Emit Broadcast" to see messages arriving.

Connections are kept alive via heartbeat comments. Cleanup occurs when the client disconnects. 