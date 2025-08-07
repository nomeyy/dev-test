# Server-Sent Events (SSE) Implementation

A complete real-time notification system using Server-Sent Events in Next.js App Router.

## 🎯 Features

- ✅ **Real-time server-to-client notifications** via SSE
- ✅ **Client connection management** with automatic cleanup
- ✅ **Named events with payloads** for structured communication
- ✅ **Heartbeat/ping mechanism** to keep connections alive
- ✅ **Error handling and logging** for robust operation
- ✅ **Backend utilities** for easy event broadcasting
- ✅ **TypeScript support** with proper type definitions
- ✅ **Mock UI** for testing and demonstration

## 📁 File Structure

```
src/
├── lib/sse/
│   ├── manager.ts       # Core SSE connection manager
│   ├── sendEvent.ts     # Backend utilities for sending events
│   └── index.ts         # Type definitions and exports
├── app/api/
│   ├── sse/route.ts         # SSE connection endpoint
│   └── test-notify/route.ts # Test endpoint for notifications
├── components/
│   └── SSETester.tsx        # React component for testing SSE
└── app/(universal)/sse-demo/
    └── page.tsx             # Demo page showcasing SSE
```

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Open the Demo Page

Navigate to `/sse-demo` in your browser to see the SSE implementation in action.

### 3. Test the Implementation

- The page will automatically connect to the SSE stream
- Click "Send Test Notification" to broadcast a message
- Watch real-time updates in the UI

## 📡 API Endpoints

### `GET /api/sse`

Establishes an SSE connection for real-time updates.

**Query Parameters:**

- `id` (optional): Client identifier. If not provided, a UUID will be generated.

**Response:** Event stream with the following events:

- `connected`: Sent when client first connects
- `notification`: Application notifications
- `ping`: Heartbeat messages (every 20 seconds)

### `POST /api/test-notify`

Sends a test notification to all connected clients.

**Request Body:**

```json
{
  "message": "Your notification message",
  "type": "info" | "success" | "warning" | "error"
}
```

**Response:**

```json
{
  "status": "sent",
  "message": "Your notification message",
  "clientsNotified": 2,
  "totalClients": 2
}
```

### `GET /api/test-notify`

Check the current status and number of connected clients.

**Response:**

```json
{
  "status": "ready",
  "connectedClients": 2,
  "timestamp": 1691234567890
}
```

## 🛠️ Usage in Your Application

### Backend: Sending Events

```typescript
import { broadcast, sendToClient, sendNotification } from "@/lib/sse/sendEvent";

// Broadcast to all clients
broadcast("user-update", { userId: 123, status: "online" });

// Send to specific client
sendToClient("client-id", "private-message", { message: "Hello!" });

// Send notification (convenience function)
sendNotification("Order completed successfully!", "success");
```

### Frontend: Receiving Events

```typescript
useEffect(() => {
  const eventSource = new EventSource("/api/sse");

  eventSource.addEventListener("notification", (event) => {
    const notification = JSON.parse(event.data);
    // Handle notification
    console.log("Received:", notification.message);
  });

  eventSource.addEventListener("user-update", (event) => {
    const update = JSON.parse(event.data);
    // Handle user update
    setUserStatus(update.userId, update.status);
  });

  return () => eventSource.close();
}, []);
```

## 🏗️ Architecture

### SSE Manager (`lib/sse/manager.ts`)

- Manages all client connections in memory
- Handles client connection and disconnection
- Provides methods for sending events to specific clients or broadcasting
- Implements heartbeat mechanism for connection health
- Automatic cleanup on process termination

### Event Utilities (`lib/sse/sendEvent.ts`)

- High-level functions for sending events
- Type-safe event broadcasting
- Convenience functions for common notification patterns
- Client count tracking

### API Routes

- **SSE Route**: Handles connection establishment and management
- **Test Route**: Provides endpoint for testing and manual event triggering

## 🎨 UI Component

The `SSETester` component provides:

- Real-time connection status display
- Latest message display
- Message history (last 10 messages)
- Manual notification sending
- Visual connection status indicators

## 🔧 Configuration

### Heartbeat Interval

Default: 20 seconds. Modify in `manager.ts`:

```typescript
setInterval(() => {
  // Send heartbeat
}, 20_000); // Change this value
```

### Message History Limit

Default: 10 messages. Modify in `SSETester.tsx`:

```typescript
setMessageHistory((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10
```

## 🚨 Error Handling

The implementation includes comprehensive error handling:

- Client disconnection detection and cleanup
- Failed message delivery handling
- Connection error recovery
- Graceful process termination

## 🔒 Security Considerations

- CORS headers are set for cross-origin requests
- Consider implementing authentication for production use
- Rate limiting may be needed for high-traffic applications
- Monitor memory usage with many concurrent connections

## 🧪 Testing

The implementation includes:

1. **Manual Testing**: Use the `/sse-demo` page
2. **API Testing**: Send POST requests to `/api/test-notify`
3. **Connection Testing**: Monitor browser developer tools for SSE events

## 📝 Type Definitions

```typescript
interface SSEMessage {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp: number;
  id: string;
}

interface SSEEvent {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
}
```

## 🎯 Acceptance Criteria Fulfilled

| **Requirement**                            | **Status** | **Implementation**                            |
| ------------------------------------------ | ---------- | --------------------------------------------- |
| ✅ SSE endpoint for client connections     | Complete   | `/api/sse` route with ReadableStream          |
| ✅ Client subscription and event reception | Complete   | EventSource integration in React              |
| ✅ Named events to specific/all clients    | Complete   | `sendToClient()` and `broadcast()` functions  |
| ✅ Heartbeat/ping for connection health    | Complete   | 20-second interval ping events                |
| ✅ Disconnect handling and cleanup         | Complete   | Automatic client removal on disconnect        |
| ✅ Error handling and logging              | Complete   | Comprehensive error handling throughout       |
| ✅ Backend utilities for event pushing     | Complete   | `sendEvent.ts` with multiple helper functions |
| ✅ Mock UI for testing                     | Complete   | `SSETester` component with full functionality |

## 🔄 Next Steps

For production deployment, consider:

1. **Authentication**: Add user authentication to SSE connections
2. **Rate Limiting**: Implement rate limiting for event sending
3. **Persistence**: Add Redis or database backing for message persistence
4. **Scaling**: Consider clustering and load balancing for multiple instances
5. **Monitoring**: Add metrics and monitoring for connection health
6. **Security**: Implement proper CORS and security headers
