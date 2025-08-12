# SSE Acceptance Guide

This document captures the acceptance criteria, flow, verification steps, and edge cases for the SSE feature: "SSE endpoint implemented to accept client connections and maintain open streams."

## Scope

- Server supports establishing Server-Sent Events (SSE) connections from authenticated clients.
- Connection remains open and continuously streams events until the client disconnects or an error occurs.
- Heartbeats are sent to keep the connection active through proxies.
- Proper cleanup happens on disconnect or error.

## Acceptance Criteria (Verified)

1. SSE endpoint implemented to accept client connections and maintain open streams
   - Evidence:
     - Endpoint implemented at `src/app/api/sse/route.ts` using a `ReadableStream` and returning appropriate SSE headers (`text/event-stream`, `keep-alive`, `no-cache`).

2. Clients can subscribe and receive events pushed from the server
   - Evidence:
     - Demo client in `src/app/(protected)/sse-demo/page.tsx` establishes `EventSource` to `/api/sse`, listens for `message`, `welcome`, and named events.
     - Reusable hook in `src/hooks/useSSE.ts` supports topics and event handlers.

3. Server code can send arbitrary named events with JSON payloads to individual or multiple clients
   - Evidence:
     - API helpers in `src/server/sse/index.ts`: `notifyUser`, `notifySession`, `notifyTopic`, `broadcast`, `notifyConnection` accept an event name and arbitrary data.
     - tRPC router in `src/server/api/routers/sse.ts` exposes test mutations allowing custom `event` names and payloads.

4. Heartbeat/ping mechanism in place to keep connections alive
   - Evidence:
     - Route-level heartbeat comment lines every 30s in `src/app/api/sse/route.ts`.
     - Manager-level broadcast heartbeat every 30s in `src/server/sse/manager.ts`.

5. Proper handling of client disconnects with cleanup of server resources
   - Evidence:
     - Abort handling and cleanup in `src/app/api/sse/route.ts` unregisters connections and closes the stream.
     - Manager `unregister` disposes of bus subscriptions and removes connection (`src/server/sse/manager.ts`).

6. Error handling and logging included
   - Evidence:
     - Logging via `src/lib/logger.ts` in route and manager for connection attempts, sends, failures, cleanup, and errors.
     - Stream write and event send operations wrapped with try/catch and error logs.

7. Well-documented usage for backend integration
   - Evidence:
     - Developer documentation in `src/server/sse/README.md` (Quick Start, API Reference, Integration Examples).
     - This `ACCEPTANCE.md` provides criteria, flow, verification, and edge cases.

## Components Involved

- Endpoint: `GET /api/sse` in `src/app/api/sse/route.ts`
- Manager: `ConnectionManager` in `src/server/sse/manager.ts`
- API helpers: `notifyUser`, `notifyTopic`, `broadcast`, etc. in `src/server/sse/index.ts`
- Demo Client: `src/app/(protected)/sse-demo/page.tsx`

## Functional Acceptance Criteria

1. Authentication
   - If the user is not authenticated, the endpoint returns `401 Unauthorized` and does not create a stream.
   - If the user is authenticated, the server proceeds to establish an SSE stream.

2. SSE Response
   - Response headers include:
     - `Content-Type: text/event-stream`
     - `Cache-Control: no-cache, no-transform`
     - `Connection: keep-alive`
     - `X-Accel-Buffering: no`
   - The response body is a `ReadableStream` that remains open.

3. Connection Lifecycle
   - On connect, server sends an initial `retry` line and a `welcome` event with connection metadata.
   - Server registers the connection with `ConnectionManager`, subscribing to broadcast, user, session, and optional topic channels.
   - Heartbeats are sent at a fixed interval to keep intermediaries from closing the stream.
   - On client disconnect or error, the server unregisters the connection and closes the stream.

4. Event Delivery
   - Events published via `notifyUser`, `notifySession`, `notifyTopic`, or `broadcast` are delivered to matching open connections.
   - Event data is serialized as JSON and emitted using SSE format (`event`, `data`, optional `id`, and blank line terminator).

5. Observability
   - Connection registrations/unregistrations and send failures are logged via `src/lib/logger.ts`.
   - Statistics are available via tRPC router (`src/server/api/routers/sse.ts` → `getStats`, `getMyConnections`, etc.).

## Non-Functional Acceptance Criteria

- Heartbeat interval keeps streams active across proxies/CDNs.
- Resource cleanup on disconnect prevents connection leaks.
- Basic CORS headers are present. For cross-origin with credentials, explicit origin and `Access-Control-Allow-Credentials: true` should be used (not `*`).

## End-to-End Flow

1. Client (browser) creates an `EventSource` to `/api/sse`, optionally with `?topic=a,b,c`.
2. Server authenticates the session. If valid, it creates a `ReadableStream` and registers the connection in `ConnectionManager`.
3. Server immediately sends `retry` metadata and a `welcome` event containing `connId`, `userId`, `sessionId`.
4. `ConnectionManager` subscribes the connection to channels: `broadcast`, `user:{userId}`, `session:{sessionId}`, and `topic:{topic}` for each requested topic.
5. Events published through the SSE API helpers are routed through the bus to subscribers and written to the stream.
6. Heartbeats are sent periodically. On abort/error, cleanup is performed and the stream is closed.

## How to Verify (Manual)

Precondition: You are signed in to the app.

1. Navigate to the demo page `/(protected)/sse-demo`.
   - Expected: Connection status transitions to `CONNECTED`.
   - Expected: A `welcome` event appears with a `connId` and `sessionId` (if available).

2. Send test events using the demo controls:
   - "To User": emits your selected event type to your user; verify it appears in the messages list.
   - "To Topic": choose a topic (e.g., `test-topic`); verify receipt when subscribed to that topic.
   - "Broadcast": verify all open demo tabs receive the event.

3. Disconnect behavior:
   - Close the tab or navigate away; the server should log unregistration, and stats should show fewer active connections.

4. Unauthorized check:
   - Open the SSE endpoint in an incognito window without logging in (e.g., navigate to `/api/sse`).
   - Expected: `401 Unauthorized` response.

## Minimal Code Snippets (Reference)

Client connection example (browser console):

```javascript
const es = new EventSource('/api/sse?topic=test-topic');
es.addEventListener('open', () => console.log('open'));
es.addEventListener('welcome', (e) => console.log('welcome', JSON.parse(e.data)));
es.addEventListener('message', (e) => console.log('message', e.data));
es.addEventListener('error', (e) => console.error('error', e));
```

Publishing events (server-side):

```ts
import { notifyUser, notifyTopic, broadcast } from '@/server/sse';

await notifyUser('user-id', 'test_message', { message: 'hello' });
await notifyTopic('test-topic', 'topic_message', { message: 'hello topic' });
await broadcast('broadcast_message', { message: 'hello everyone' });
```

## Edge Cases

- Multiple tabs per user: all tabs receive user-targeted events; session-targeted events go only to the matching tab.
- Empty topic list: stream still opens; only broadcast/user/session channels are subscribed.
- Network interruptions: browser will auto-retry; server supports reconnect via `retry` line. If you need resume with `Last-Event-ID`, add event `id`s in the stream.

## Definition of Done

- Authenticated clients can connect to `/api/sse` and receive a `welcome` event.
- Response uses `text/event-stream` and remains open with periodic heartbeats.
- Events published through the API helpers are delivered to connected clients as expected.
- Disconnections trigger cleanup and stats reflect accurate counts.
- Unauthorized requests return `401` without opening a stream.

## Related Files

- `src/app/api/sse/route.ts`
- `src/server/sse/manager.ts`
- `src/server/sse/index.ts`
- `src/server/api/routers/sse.ts`
- `src/app/(protected)/sse-demo/page.tsx`


