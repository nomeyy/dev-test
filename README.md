# Nomey Web App
This is the official repository for the Nomey web app, built on the T3 Stack with custom extensions.

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

## 📡 Server-Sent Events (SSE) Layer

This project includes a reusable, abstracted Server-Sent Events (SSE) layer to enable real-time, server-to-client notifications across the app. This base SSE service manages client connections, handles event dispatching, and provides a clean interface for backend features to push updates to connected clients.

### 🎯 Goals

This SSE layer implements a centralized manager to:

- **Track active client connections** (per user or session)
- **Send named events with payloads** to specific clients or broadcast to multiple clients
- **Handle client connection lifecycle** (connect, disconnect, errors)
- **Provide API/utility functions** for backend modules to send notifications without managing SSE protocol details
- **Ensure SSE connections remain alive** with heartbeat/ping messages to prevent timeouts
- **Clean up client connections properly** on disconnect or errors to avoid resource leaks

### ✅ Acceptance Criteria

- ✅ **SSE endpoint implemented** to accept client connections and maintain open streams
- ✅ **Clients can subscribe** and receive events pushed from the server
- ✅ **Server code can send arbitrary named events** with JSON payloads to individual or multiple clients
- ✅ **Heartbeat/ping mechanism** in place to keep connections alive
- ✅ **Proper handling of client disconnects** with cleanup of server resources
- ✅ **Error handling and logging** included
- ✅ **Well-documented usage** for backend integration

### 📋 Quick Usage

#### Backend Integration

```ts
import { notificationsService } from "@/features/notifications";

// Send notification to all connected clients
notificationsService.notifyAll("system-alert", { 
  message: "Server maintenance in 5 minutes" 
});

// Send to specific client
notificationsService.notifyClient("user-123", "order-updated", { 
  orderId: 456, 
  status: "shipped" 
});

// Send to multiple clients
notificationsService.notifyMany(["user-1", "user-2"], "invite", { 
  eventId: 789, 
  eventName: "Team Meeting" 
});
```

#### Client-side Usage (React)

```tsx
import { api } from "@/trpc/react";

// Subscribe to SSE events
const notifications = api.notifications.subscribe.useSubscription(undefined, {
  onData(event) {
    console.log("Received SSE event:", event);
  },
});
```

### 🧪 SSE Testing

A simple mock UI is available at `/` to demonstrate SSE functionality:

- **Connection management** - Connect/disconnect to SSE
- **Test button** - Send test messages to trigger SSE events  
- **Message display** - Shows the latest received SSE message
- **Automatic events** - Mock events generated every 1-3 seconds

### 🏗️ SSE Architecture

```
src/features/notifications/
├── components/
│   ├── NotificationsDemo.tsx    # Simple mock UI
│   └── index.ts
├── services/
│   ├── manager.ts               # Core SSE manager
│   ├── mock.ts                  # Mock event generation
│   ├── register.ts              # Plugin registration
│   └── index.ts                 # Service interface
├── trpc/
│   └── index.ts                 # tRPC integration
├── types/
│   └── index.ts                 # TypeScript definitions
└── index.ts                     # Main exports
```

## Learn More

 - [Nomey Documentation (WIP)](https://nomey.mintlify.app/)
 - [Next Documentation](https://nextjs.org/docs)
 - [T3 Stack Documentation](https://create.t3.gg/en/usage/first-steps)
 - [Mux Documentation](https://www.mux.com/docs)
