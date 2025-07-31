# Nomey Web App

This is the official repository for the Nomey web app, built on the T3 Stack with custom extensions.

## 🚀 Server-Sent Events (SSE) System

This application includes a comprehensive, production-ready SSE implementation for real-time server-to-client notifications.

### ✅ Features Implemented

- **SSE Endpoint**: `/api/sse` accepts client connections and maintains open streams
- **Event Broadcasting**: Send events to individual clients, specific users, or broadcast to all
- **Heartbeat System**: Automatic ping/pong to keep connections alive (25s intervals)
- **Connection Management**: Proper cleanup on disconnect, stale connection detection
- **Error Handling**: Comprehensive logging and graceful fallbacks
- **Redis Integration**: Scalable pub/sub with automatic fallback to in-memory
- **TypeScript**: Full type safety throughout the SSE system

### 🔧 Backend Integration Guide

#### Quick Start - Send Events

```typescript
import { sendSSEEvent } from "@/lib/sse/manager";
import { SSEEventType } from "@/lib/sse/types";

// Send to all connected clients
await sendSSEEvent(
  SSEEventType.BROADCAST,
  {
    title: "System Update",
    message: "New features available!",
  },
  { broadcast: true },
);

// Send to specific user
await sendSSEEvent(
  SSEEventType.NOTIFICATION,
  {
    title: "Personal Message",
    message: "You have a new message",
  },
  { userId: "user123" },
);

// Send custom event
await sendSSEEvent(
  "custom_event",
  {
    data: { key: "value" },
    timestamp: Date.now(),
  },
  { broadcast: true },
);
```

#### Using tRPC Endpoints

```typescript
// From any React component
const sendMessage = api.sse.sendTestMessage.useMutation();

await sendMessage.mutateAsync({
  message: "Hello World!",
  broadcast: true,
});

// Send user notification (requires auth)
const notify = api.sse.sendUserNotification.useMutation();
await notify.mutateAsync({
  userId: "user123",
  title: "Alert",
  message: "Action required",
});
```

#### React Hook Usage

```typescript
import { useSSE } from '@/lib/sse/hooks/useSSE';

function MyComponent() {
  const sse = useSSE({
    debug: true,
    maxHistorySize: 50
  });

  return (
    <div>
      <p>Status: {sse.status}</p>
      <p>Events: {sse.eventHistory.length}</p>
      <p>Latest: {sse.lastEvent?.data?.message}</p>

      <button onClick={sse.connect}>Connect</button>
      <button onClick={sse.disconnect}>Disconnect</button>
    </div>
  );
}
```

#### Available tRPC Endpoints

- `api.sse.sendTestMessage` - Send test message (public)
- `api.sse.sendUserNotification` - Send to specific user (protected)
- `api.sse.broadcastNotification` - Broadcast to all users (protected)
- `api.sse.sendCustomEvent` - Send custom event (protected)
- `api.sse.getPublicStats` - Get connection stats (public)

#### Event Types

```typescript
enum SSEEventType {
  HEARTBEAT = "heartbeat",
  CONNECTED = "connected",
  NOTIFICATION = "notification",
  USER_UPDATE = "user_update",
  BROADCAST = "broadcast",
  TEST_MESSAGE = "test_message",
}
```

#### Integration Examples

**Webhook Handler:**

```typescript
// In your webhook handler
import { sendSSEEvent } from "@/lib/sse/manager";

export async function POST(request: Request) {
  const data = await request.json();

  // Notify all users of webhook event
  await sendSSEEvent(
    "webhook_received",
    {
      type: data.type,
      payload: data,
    },
    { broadcast: true },
  );

  return Response.json({ success: true });
}
```

**Job Processor:**

```typescript
// In background job
await sendSSEEvent(
  "job_completed",
  {
    jobId: job.id,
    status: "completed",
    result: job.result,
  },
  { userId: job.userId },
);
```

### 🧪 Demo & Testing

Visit `/sse-demo` to see the SSE system in action with:

- Live connection status
- Real-time event display
- Interactive message sending
- Connection statistics
- Event history

## Tech Stack

- [Next.js](https://nextjs.org) - App Framework
- [NextAuth.js](https://next-auth.js.org) - Authentication
- [Prisma](https://prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - CSS Utility Framework
- [tRPC](https://trpc.io) - API Framework
- [Mux]() - Video handling (upload / storage / etc.)
- [tolgee](https://tolgee.io/) - Translation Management
- [Meilisearch](https://www.meilisearch.com/) - Full-text search
- [Upstash](https://upstash.com/) Next compatible redis
- [Qstash](https://upstash.com/docs/qstash) Next compatible queue handling
- [Vitest](https://vitest.dev/) - Testing Framework

## Testing

This project uses [Vitest](https://vitest.dev/) to run both client-side (browser) and server-side (Node.js) tests.

### Project Structure

Tests are split into two environments:

- **Browser (jsdom)** — for React/browser environment tests.
- **Node.js** — for backend and server-only logic.

### File Naming Conventions

- Node-specific tests: `*.node.test.ts`
- Browser tests: any other `*.test.ts`, `*.test.tsx`, etc.

### Running Tests

Run **all tests**:

```bash
npm run test
```

## Local Development

### Clone and Install

```bash
git clone git@github.com:nomeyy/nomey-next.git
cd nomey-next
npm install
```

### Run Containers

You'll need to have `docker` installed locally. We advise running `./scripts/start-services.sh` to safely start your environment, but a normal docker workflow will also work.

### Run Next

```bash
npm run dev
```

> ⚠️ **Warning:** The T3 stack hard-enforces environment variables to provide type-safety. The project will not build without all environment variables in place. Contact a dev to get their variables to quickly get yourself up and running.

## Learn More

- [Nomey Documentation (WIP)](https://nomey.mintlify.app/)
- [Next Documentation](https://nextjs.org/docs)
- [T3 Stack Documentation](https://create.t3.gg/en/usage/first-steps)
- [Mux Documentation](https://www.mux.com/docs)
