# Server-Sent Events (SSE) Feature

This module provides a reusable, user-based Server-Sent Events (SSE) layer for real-time server-to-client notifications.

## Features
- Tracks active client connections by authenticated user ID
- Allows sending named events with JSON payloads to specific users or broadcasting to all
- Handles client connection lifecycle (connect, disconnect, errors)
- Heartbeat/ping mechanism to keep connections alive
- Utility functions for backend modules to send notifications
- Error handling and logging

## Usage

### 1. SSE API Endpoint
Clients connect to `/api/sse` using EventSource:

```js
const es = new EventSource('/api/sse');
es.addEventListener('message', (e) => {
  console.log('Message:', e.data);
});
es.addEventListener('ping', () => {
  // Heartbeat
});
```

### 2. Sending Events from Backend
Import and use the utility functions:

```ts
import { sendSSEToUser, broadcastSSE } from '@/features/sse';

// Send to a specific user
sendSSEToUser(userId, 'notification', { message: 'Hello!' });

// Broadcast to all
broadcastSSE('system-update', { version: '1.2.3' });
```

### 3. Event Format
Events are sent as named events with JSON payloads:

```
event: <eventName>
data: <JSON string>


```

### 4. Heartbeat
A `ping` event is sent every 25 seconds to keep connections alive.

### 5. Error Handling
Connection and event errors are logged to the server console.

## Integration
- The SSE manager is singleton and can be used from any backend module.
- Only authenticated users can connect (session required).

## Example: Trigger from Webhook or Job
```ts
import { sendSSEToUser } from '@/features/sse';

// In a webhook handler or background job
sendSSEToUser(userId, 'job-complete', { jobId: 'abc123' });
``` 