# SSE Bootcamp Backend

This backend provides Server-Sent Events (SSE) functionality, allowing clients to subscribe and receive real-time events pushed from the server.

## Features

- **SSE endpoint** for client subscriptions and open event streams
- **Push events** to individual clients or broadcast to all
- **Named events** with JSON payloads
- **Heartbeat/ping** mechanism to keep connections alive
- **Automatic cleanup** on client disconnect
- **Error handling** and logging

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm

### Installation

```bash
npm install
```

### Running the Server

```bash
npm start
```

The server will start on the port specified in your `.env` file or default to `3000`.

## SSE Usage

### Connect to SSE

Clients connect to the SSE endpoint:

```
GET /sse/connect
```

Example (JavaScript client):

```js
const evtSource = new EventSource('http://localhost:3000/sse/connect');
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
evtSource.addEventListener('custom-event', (event) => {
  const data = JSON.parse(event.data);
  console.log('Custom event:', data);
});
```

### Sending Events from the Server

Use the `sseService` methods to send events:

- `broadcast(eventName, payload)` — Send to all clients
- `sendToClient(clientId, eventName, payload)` — Send to a specific client

Example:

```js
const sseService = require('./services/sseService');

// Broadcast a message
sseService.broadcast('notification', { message: 'Hello, clients!' });

// Send to a specific client
sseService.sendToClient(clientId, 'private-message', { text: 'Hello, user!' });
```

### Heartbeat

A heartbeat (ping) is sent every 30 seconds to keep connections alive.

### Disconnect Handling

When a client disconnects, resources are cleaned up automatically.

## Error Handling & Logging

Errors and disconnects are logged to the console. You can extend logging as needed.

## Project Structure

```
backend/
  ├── .env
  ├── package.json
  └── src/
      ├── server.js
      ├── routes/
      │   ├── api.js
      │   └── sse.js
      └── services/
          └── sseService.js
```