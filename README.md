# SSE Demo - Real-time Server-Sent Events

A practical demonstration of Server-Sent Events (SSE) implementation in Next.js, showcasing real-time communication between server and client.

## Features

- **Real-time messaging** - Live updates without polling
- **Multi-client support** - Handle multiple connections simultaneously
- **Connection monitoring** - Track active clients and connection status
- **Event broadcasting** - Send messages to all connected clients
- **Automatic reconnection** - Built-in resilience for network issues
- **Clean UI** - Simple interface to test and monitor SSE functionality

## Quick Start

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **Navigate to the demo**
   - Visit `/sse-demo` (requires login)
   - Open multiple browser windows to test multi-client functionality

3. **Test the features**
   - Click "Send Notification" to broadcast messages
   - Click "Send Alert" for alert-type messages
   - Monitor connection status and client count in real-time

## How it Works

The demo uses Server-Sent Events to establish a persistent connection between the browser and server. Each client gets a unique identifier, allowing you to track individual connections while testing broadcast functionality.

### Key Components

- **SSE Manager** - Handles client connections and message broadcasting
- **API Routes** - `/api/sse` for connections, `/api/sse/trigger` for sending events
- **Demo Interface** - Clean UI showing live messages and connection stats

### Technical Details

- Built with Next.js App Router
- TypeScript for type safety
- Automatic heartbeat to maintain connections
- Graceful error handling and reconnection logic

## Architecture

```
├── src/lib/sse/           # Core SSE functionality
├── src/lib/sse-demo/      # Demo UI components
├── src/app/api/sse/       # API endpoints
└── src/app/(protected)/sse-demo/  # Demo page (login required)
```

## Testing Multiple Clients

1. Open the SSE demo in multiple browser windows
2. Notice each window gets a unique client ID
3. Send notifications from one window
4. Watch messages appear in all connected windows
5. Monitor the client count updating in real-time

This demonstrates the multi-client broadcasting capability essential for real-time applications like chat systems, live notifications, and collaborative tools.
