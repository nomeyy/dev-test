# 📡 SSE Manager Integration Guide (With Webhooks & Backend)

## ✅ Overview

This SSEManager allows your backend to send real-time server-sent events (SSE) to connected clients via HTTP streaming. It maintains a list of clients and supports:

- Adding/removing clients
- Broadcasting messages to all or chunked users
- Sending messages to specific users
- Automatic heartbeats
- Integration with webhooks & backend events

## 🧩 File Structure

```bash
/lib
  └── sse.ts           # SSEManager implementation
/app/api/sse/route.ts  # HTTP GET route to initialize SSE connection
/utils/service-utils.ts # Contains chunkArray
```

## 🔌 How It Works

1. Client connects to `/api/sse`, passing a unique `x-user-id` in headers.
2. Server upgrades the connection to an event stream (`Content-Type: text/event-stream`).
3. The SSEManager stores the client and sends heartbeats every 30s.
4. The backend can push messages to individual clients or broadcast to all.
5. If the webhook or event occurs, the backend calls `sseManager.sendToUser(...)` or `sseManager.broadcast(...)`.

## 🌐 Client-Side Setup (Browser)

```typescript
const userId = "user-123"; // Should match backend logic

const sse = new EventSource("/api/sse", {
  headers: { "x-user-id": userId },
});

sse.addEventListener("message", (e) => {
  console.log("Message:", e.data);
});

sse.addEventListener("update", (e) => {
  const payload = JSON.parse(e.data);
  console.log("Update event received:", payload);
});
```

## 🧪 Connecting to SSE (API Route)

**File:** `/app/api/sse/route.ts`

Your GET handler upgrades to a `text/event-stream` and registers the client.

```typescript
// Usage: GET /api/sse with header: x-user-id
```

- Validates and extracts user ID
- Writes a `data: connected\n\n` message
- Cleans up on client disconnect

## 🧠 Server-Side: Using SSEManager

### ➕ Add Client (Auto-handled in /api/sse route)

```typescript
sseManager.addClient(userId, {
  write: async (chunk: string) => writer.write(encoder.encode(chunk)),
  end: async () => writer.close(),
});
```

### ➖ Remove Client

```typescript
sseManager.removeClient(userId);
```

### 📤 Send Message to a User

```typescript
await sseManager.sendToUser("user-123", "update", {
  message: "Your upload is complete!",
});
```

### 📣 Broadcast to All Clients

```typescript
await sseManager.broadcast("system-update", {
  title: "New version deployed!",
});
```

## 🔁 Integrating with Webhooks

Webhooks can act as triggers to notify connected users via SSE.

### 🔗 Example: Webhook Endpoint (POST /api/webhook)

```typescript
import { sseManager } from "@/lib/sse";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId;
    const eventType = body.event || "update";

    // Send to a specific client
    await sseManager.sendToUser(userId, eventType, {
      message: body.message,
    });

    return new Response("Sent", { status: 200 });
  } catch (error) {
    return new Response("Error handling webhook", { status: 500 });
  }
}
```

### 🔂 Example Payload from Webhook

```json
{
  "userId": "user-123",
  "event": "order-status",
  "message": "Your order has been shipped"
}
```

## 🧰 Backend Usage Scenarios

| Scenario                   | Usage                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| Notify user on payment     | `sseManager.sendToUser("user-xyz", "payment-success", {...})`       |
| Alert all admins           | `sseManager.broadcast("alert", { title: "System issue detected" })` |
| Real-time status update    | `sseManager.sendToUser(userId, "status", { step: "in-progress" })`  |
| Broadcast webhook messages | Forward webhook data directly to `sendToUser` or `broadcast`        |

## ❤️ Best Practices

- Use `x-user-id` header consistently across backend & frontend
- On disconnect, clients are auto-removed
- For high-scale apps, consider Redis pub/sub for horizontal scaling
- Avoid sending sensitive data directly unless encrypted/obfuscated

## 🧪 Debug Logging

Logs can be seen using:

```typescript
import { sseLogs } from "@/lib/sse";

sseLogs.info("New event sent");
```

Errors are handled via:

```typescript
import { sseHandleError } from "@/lib/sse";

sseHandleError("Something went wrong", err);
```

## 🚦 Heartbeat

Every 30 seconds:

```typescript
client.write(`:ping\n\n`);
```

Used to keep the connection alive and detect stale/disconnected clients.

## 🔒 Security Notes

- Ensure only authenticated users can access the `/api/sse` route.
- Optionally validate the `x-user-id` against sessions or JWT.

## 📁 Utilities Used

### chunkArray

```typescript
function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}
```

### createServiceContext

Used to provide scoped logging and error handling.

## 📎 Summary

With this SSEManager setup:

- Clients can receive real-time updates
- Backend can trigger events via API/webhooks
- Simple, scalable, and structured approach to SSE
