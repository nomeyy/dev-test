# Nomey Web App
This is the official repository for the Nomey web app, built on the T3 Stack with custom extensions.

## Tech Stack   check

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

---

# Server-Sent Events (SSE) Feature

A comprehensive, reusable Server-Sent Events implementation for real-time server-to-client notifications.

## SSE Overview

This SSE feature provides a centralized, abstracted layer for managing real-time communications between your server and client applications. It handles client connection management, event dispatching, heartbeat mechanisms, and provides clean APIs for backend integration.

## SSE Features

### Core Functionality
- ✅ **Centralized SSE Manager** - Track and manage all active client connections
- ✅ **Targeted Messaging** - Send events to specific clients, users, or sessions
- ✅ **Broadcast Messaging** - Send events to all connected clients
- ✅ **Connection Lifecycle Management** - Handle connect, disconnect, and error states
- ✅ **Heartbeat/Ping System** - Keep connections alive and detect stale connections
- ✅ **Automatic Cleanup** - Remove expired connections and prevent resource leaks
- ✅ **Error Handling & Logging** - Comprehensive error handling with configurable logging

### Client-Side Features
- ✅ **React Hook Integration** - `useSSE` hook for easy frontend integration
- ✅ **Automatic Reconnection** - Configurable reconnection with exponential backoff
- ✅ **Connection State Management** - Track connection states (connecting, connected, etc.)
- ✅ **Event Listeners** - Easy event handling for different message types
- ✅ **TypeScript Support** - Full type safety throughout the library

## SSE API Endpoints

### GET `/api/sse`
Establishes an SSE connection for a client.

**Query Parameters:**
- `userId` (optional) - Associate connection with a user
- `sessionId` (optional) - Associate connection with a session

### POST `/api/sse/send`
Send a message through SSE to connected clients.

**Request Body:**
```typescript
{
  event: string;                    // Event name
  data: any;                       // Event payload
  targetUserId?: string;           // Send to specific user
  targetSessionId?: string;        // Send to specific session  
  targetClientId?: string;         // Send to specific client
}
```

### GET `/api/sse/send`
Get SSE connection statistics and active connections.

## SSE Usage

### Backend Integration

```typescript
import { notifyUser, broadcastNotification, notifications } from '@/features/sse';

// Send notification to a specific user
notifyUser('user-123', 'notification', {
  title: 'New Message',
  message: 'You have received a new message',
  type: 'info'
});

// Broadcast to all connected clients
broadcastNotification('announcement', {
  message: 'System maintenance starting in 10 minutes',
  type: 'warning'
});

// Use helper notifications
notifications.userAction(
  'user-123',
  'like', 
  { id: 'user-456', name: 'Jane Doe' },
  { type: 'post', id: '789' }
);
```

#### Integration with Webhooks/Job Processors
```typescript
// In a webhook handler or job processor
import { notifications } from '@/features/sse';

export async function handleMuxWebhook(payload: MuxWebhookPayload) {
  if (payload.type === 'video.asset.ready') {
    // Notify user that their video is ready
    notifications.update(
      payload.userId,
      'video',
      payload.data.id,
      'updated',
      { status: 'ready', playback_url: payload.data.playback_ids[0].id }
    );
  }
}
```

### Frontend Integration

```typescript
import { useSSE } from '@/features/sse';

function NotificationComponent() {
  const { 
    isConnected, 
    lastMessage, 
    error, 
    addEventListener 
  } = useSSE('/api/sse', {
    userId: currentUser.id,
    autoConnect: true,
    reconnect: true,
    maxReconnectAttempts: 5
  });

  useEffect(() => {
    // Handle specific events
    addEventListener('notification', (data) => {
      showToast(data.title, data.message, data.type);
    });

    addEventListener('user-action', (data) => {
      if (data.action === 'like') {
        updateLikeCount(data.resource.id);
      }
    });
  }, [addEventListener]);

  return (
    <div>
      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
        {isConnected ? '● Connected' : '● Disconnected'}
      </span>
    </div>
  );
}
```

## SSE Demo

Visit `/sse-demo` in your application to see the SSE feature in action. The demo includes:

1. **Simple Demo** - Basic button and text component showing latest SSE message
2. **Full Featured Demo** - Complete demonstration of all SSE features
3. **Usage Documentation** - Code examples and integration guides

### Testing SSE

1. Navigate to `/sse-demo` in your browser
2. Click "Connect" to establish an SSE connection
3. Use the test buttons to send various types of messages
4. Open multiple browser tabs/windows to test multi-client functionality
5. Check browser dev tools for SSE connection in Network tab

## SSE Architecture

```
src/features/sse/
├── types/
│   └── index.ts              # TypeScript definitions
├── services/
│   ├── sse-manager.ts        # Core SSE management class
│   └── sse-instance.ts       # Global instance management
├── client/
│   └── sse-client.ts         # Client-side SSE utilities
├── hooks/
│   └── useSSE.ts             # React hook for SSE
├── components/
│   ├── SSEDemo.tsx           # Full-featured demo
│   └── SimpleSSEDemo.tsx     # Simple demo component
├── utils/
│   └── sse-utils.ts          # Helper functions and notifications
└── index.ts                  # Feature exports
```

## SSE Event Types

### Built-in Events
- `connected` - Sent when client first connects
- `ping` - Heartbeat event to keep connection alive
- `notification` - General notifications
- `user-action` - User activity notifications
- `system-notification` - System-wide notifications
- `resource-update` - Resource change notifications
- `chat-message` - Chat/messaging events
- `typing-indicator` - Typing status events
- `announcement` - Broadcast announcements

### Custom Events
You can send any custom event type:

```typescript
// Backend
notifyUser('user-123', 'custom-event', { 
  customData: 'any data structure' 
});

// Frontend
addEventListener('custom-event', (data) => {
  // Handle custom event
});
```
