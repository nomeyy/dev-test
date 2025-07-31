# 🔌 Server-Sent Events (SSE) System

A reusable, abstracted SSE layer that enables real-time server-to-client notifications using a centralized manager. Built for per-user targeting, broadcasts, and easy backend integration.

---

## 📦 Features

- Tracks active clients per user
- Broadcast or targeted message support
- Connection lifecycle management
- Heartbeat/ping system to prevent timeouts
- Clean utility API for backend use
- Error-safe and production-ready

---

## 🧱 File Overview

### `sse-manager.ts`

- Manages all connected clients (Map<userId, SSEClient>)
- `connect(userId, writer)`: registers a new client and starts heartbeat
- `disconnect(userId)`: safely closes and cleans up
- `sendToUser(userId, event, data)`: sends event to one client
- `broadcast(event, data)`: sends event to all clients

### `send-event.ts`

- Exports helper utilities:
  - `sendSSEToUser(userId, event, data)`
  - `broadcastSSE(event, data)` // sends message to all users

### API Routes

- `/api/sse`: Handles connections using TransformStream, links to `sseManager`
- `/api/sse-trigger`: Broadcasts `test_event` for testing
- `/api/sse-to-user`: Sends `user_event` to specific user

### Frontend Components

- `SSETester.tsx`: Subscribes to SSE, handles messages, displays output
- `TriggerSSE.tsx`: Button to trigger server broadcast

---

## 🚀 How It Works

1. User connects to `/api/sse`
2. Their session is authenticated, and they're registered via `sseManager.connect(...)`
3. Messages can now be sent to them using:
   - `sendSSEToUser(userId, "event", { message })`
   - `broadcastSSE("event", { message })`
4. If client disconnects (tab closes, error, etc), server triggers cleanup

---

## 📤 Backend Usage

### Import

```ts
import { sendSSEToUser, broadcastSSE } from "@/server/sse/send-event";
```

### Send to Specific User

```ts
sendSSEToUser("user-123", "notification", { message: "Hello!" });
```

### Replace userId with any of the registered user

curl -X POST http://localhost:3000/api/sse-to-user \
 -H "Content-Type: application/json" \
 -d '{
"userId": "cmdrd6mb4000g18dk6qn14481",
"message": "Hello user awais!"
}'

### Broadcast to All Users

```ts
broadcastSSE("announcement", { message: "System will restart at 10PM" });
```

### Typical Use Cases

- Job queue completion updates
- Webhook handlers (Stripe, etc)
- Real-time metrics or logs
- Notifications

---

## 📡 Frontend Usage

### Connection Setup

Uses `EventSource("/api/sse")` with handlers for:

- `ping` (heartbeat)
- `test_event` (broadcast)
- `user_event` (private message)

### Error Handling

- Logs and resets on broken connection or bad JSON
- UI responds to `subscribe` / `unsubscribe` buttons

---

## 🧯 Error Safety

- All writes are wrapped in `try/catch`
- Dead clients are auto-cleaned
- Logs all connection/disconnection events

---

## ✅ Summary

| Feature                              | Status |
| ------------------------------------ | ------ |
| Central manager                      | ✅     |
| Per-user and broadcast support       | ✅     |
| Utility functions for backend use    | ✅     |
| Frontend listener with UI buttons    | ✅     |
| Full error handling and logging      | ✅     |
| Clean separation of concerns         | ✅     |
| Ready for production (single-server) | ✅     |

---

## Login with discord

## Subscribe to receive events

## Send broadcast is a button just to show the functionality to send event to all users

## The sendToUser function is a utility that can be used within a webhook to notify a specific user when a particular trigger occurs. You simply need to provide the userId as a parameter.

## The client will be disconnected on session end or sign out.
