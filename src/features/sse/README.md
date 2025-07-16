# Server-Sent Events (SSE) Feature

A reusable, abstracted Server-Sent Events (SSE) layer that enables real-time, server-to-client notifications across the application. This feature provides a centralized SSE manager that handles client connections, event dispatching, and provides a clean interface for backend features to push updates to connected clients.

## Features

- ✅ **Centralized Connection Management**: Track active client connections per user or session
- ✅ **Event Dispatching**: Send named events with payloads to specific clients or broadcast to multiple clients
- ✅ **Connection Lifecycle Management**: Handle connect, disconnect, and error states
- ✅ **Backend Integration**: Clean API for backend modules to send notifications without SSE protocol details
- ✅ **Heartbeat/Ping System**: Keep connections alive and detect stale connections
- ✅ **Resource Cleanup**: Proper cleanup of client connections on disconnect or errors
- ✅ **Error Handling & Logging**: Comprehensive error handling and logging throughout
- ✅ **Type Safety**: Full TypeScript support with proper type definitions

## Architecture

The SSE system consists of several key components:

### Core Services

1. **SSE Connection Manager** (`services/sse-connection-manager.ts`)
   - Manages client connections
   - Handles connection lifecycle
   - Implements heartbeat mechanism
   - Provides low-level SSE operations

2. **SSE Service** (`services/sse-service.ts`)
   - High-level API for backend integration
   - Provides clean interface for sending notifications
   - Handles event validation and formatting

3. **Backend Utilities** (`utils/backend-utils.ts`)
   - Convenient helper functions for common use cases
   - Pre-configured integrations for various features
   - Typed notification helpers

### API Endpoints

1. **SSE Connection Endpoint** (`/api/sse`)
   - Handles client connections
   - Manages SSE streams
   - Supports authentication and user identification

2. **Test Endpoint** (`/api/sse/test`)
   - Utility endpoint for testing SSE functionality
   - Supports different event types
   - Provides connection statistics

### Types & Schemas

All types are defined in `types/index.ts` with Zod schemas for runtime validation:

- `SSEEvent`: Base event structure
- `SSEClient`: Client connection information
- `SSENotificationEvent`: Notification payload structure
- Various configuration types

## Usage

### Basic Client Connection

```typescript
// Connect to SSE stream
const eventSource = new EventSource("/api/sse?clientId=my-client-id");

// Listen for events
eventSource.addEventListener("notification", (event) => {
  const data = JSON.parse(event.data);
  console.log("Notification:", data);
});

// Handle connection events
eventSource.addEventListener("connected", (event) => {
  console.log("Connected to SSE stream");
});

eventSource.addEventListener("ping", (event) => {
  console.log("Heartbeat received");
});
```

### Sending Notifications from Backend

#### Using High-Level Utilities

```typescript
import { notifications, integrations } from "@/features/sse";

// Send success notification
await notifications.success(userId, "Operation completed successfully!");

// Send error notification
await notifications.error(userId, "Something went wrong", {
  errorCode: "E001",
});

// Send warning
await notifications.warning(userId, "This action cannot be undone");

// Send info message
await notifications.info(userId, "New features available");

// Send progress update
await notifications.progress(userId, "Processing... 75%", { progress: 75 });
```

#### Using Direct Service API

```typescript
import { sseService } from "@/features/sse";

// Send custom notification
await sseService.sendNotification(userId, {
  type: "notification",
  title: "Upload Complete",
  message: "Your video has been processed successfully",
  data: { videoId: "abc123", url: "https://example.com/video" },
  priority: "high",
});

// Send custom event
await sseService.sendCustomEvent(userId, "video.progress", {
  videoId: "abc123",
  progress: 85,
  stage: "encoding",
});

// Broadcast to all users
await sseService.broadcastEvent("maintenance", {
  message: "System maintenance in 5 minutes",
  scheduledTime: Date.now() + 5 * 60 * 1000,
});
```

### Feature-Specific Integrations

#### Video/Upload Integration

```typescript
import { integrations } from "@/features/sse";

// Video upload workflow
await integrations.video.uploadStarted(userId, videoId);
await integrations.video.uploadProgress(userId, videoId, 50);
await integrations.video.uploadCompleted(userId, videoId);
await integrations.video.uploadFailed(userId, videoId, "Processing error");
```

#### Email Integration

```typescript
import { integrations } from "@/features/sse";

// Email notifications
await integrations.email.sent(userId, "welcome-email");
await integrations.email.failed(userId, "welcome-email", "SMTP error");
```

#### User Management Integration

```typescript
import { integrations } from "@/features/sse";

// User lifecycle events
await integrations.user.welcomeMessage(userId);
await integrations.user.profileUpdated(userId);
await integrations.user.accountVerified(userId);
```

### System-Wide Notifications

```typescript
import { systemNotifications } from "@/features/sse";

// System maintenance
await systemNotifications.maintenance("Database maintenance scheduled");

// Service updates
await systemNotifications.serviceUpdate("New features deployed");

// Emergency notifications
await systemNotifications.emergency("Service temporarily unavailable");
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_SSE_OPTIONS = {
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 60000, // 1 minute
    maxMissedPings: 3,
  },
  maxConnections: 1000,
  connectionTimeout: 300000, // 5 minutes
  enableLogging: true,
};
```

### Custom Configuration

```typescript
import { SSEService } from "@/features/sse";

const customSSEService = new SSEService({
  heartbeat: {
    interval: 15000, // 15 seconds
    timeout: 30000, // 30 seconds
    maxMissedPings: 2,
  },
  maxConnections: 500,
  enableLogging: false,
});
```

## Event Types

### Standard Events

- `connected`: Client successfully connected
- `ping`: Heartbeat/keep-alive message
- `notification`: General notification
- `alert`: High-priority alert
- `update`: Progress or status update
- `system`: System-wide message

### Custom Events

You can send custom events with any event type:

```typescript
await sseService.sendCustomEvent(userId, "order.status", {
  orderId: "order-123",
  status: "shipped",
  trackingNumber: "ABC123",
});
```

## Error Handling

The SSE system includes comprehensive error handling:

```typescript
// Service-level error handling
try {
  await sseService.sendNotification(userId, notification);
} catch (error) {
  console.error("Failed to send notification:", error);
  // Handle error appropriately
}

// Connection-level error handling
eventSource.onerror = (error) => {
  console.error("SSE connection error:", error);
  // Implement reconnection logic
};
```

## Monitoring & Statistics

### Connection Statistics

```typescript
import { getConnectionStats } from "@/features/sse";

const stats = getConnectionStats();
console.log("Active connections:", stats.activeConnections);
console.log("Total connections:", stats.totalConnections);
console.log("Uptime:", stats.uptime);
```

### Active Connection Count

```typescript
import { getActiveConnectionCount } from "@/features/sse";

const count = getActiveConnectionCount();
console.log("Currently connected clients:", count);
```

## Demo

A complete demo is available at `/sse-demo` that showcases:

- Connection management
- Different event types
- Real-time message display
- Connection statistics
- Test functionality

## Testing with Postman

You can test the SSE system using Postman to send events and monitor connections.

### **Get Connection Statistics**

**Method:** GET  
**URL:** `http://localhost:3000/api/sse/test`  
**Headers:**

```
Content-Type: application/json
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "activeConnections": 2,
    "totalConnections": 5,
    "uptime": 125000
  },
  "activeCount": 2,
  "clients": [
    {
      "id": "client-1704123456789-abc123",
      "userId": "demo-user-123",
      "sessionId": null,
      "connectedAt": 1704123456789,
      "lastPing": 1704123481234,
      "metadata": {
        "userAgent": "Mozilla/5.0...",
        "ip": "127.0.0.1"
      }
    }
  ]
}
```

### **Send Test Events**

**Method:** POST  
**URL:** `http://localhost:3000/api/sse/test`  
**Headers:**

```
Content-Type: application/json
```

#### **Send Notification to Specific User**

```json
{
  "userId": "demo-user-123",
  "type": "notification",
  "message": "Your upload is complete!",
  "data": {
    "uploadId": "abc123",
    "filename": "video.mp4",
    "size": 1024000
  }
}
```

#### **Send Alert to User**

```json
{
  "userId": "demo-user-123",
  "type": "alert",
  "message": "Your account will expire in 24 hours",
  "data": {
    "expiryDate": "2024-01-01T00:00:00Z",
    "action": "renew_subscription"
  }
}
```

#### **Send Update to User**

```json
{
  "userId": "demo-user-123",
  "type": "update",
  "message": "Processing video: 85% complete",
  "data": {
    "progress": 85,
    "stage": "encoding",
    "estimatedTime": "2 minutes"
  }
}
```

#### **Send System-Wide Message**

```json
{
  "type": "system",
  "message": "System maintenance scheduled for tonight at 2 AM",
  "data": {
    "maintenanceStart": "2024-01-01T02:00:00Z",
    "expectedDuration": "2 hours",
    "affectedServices": ["upload", "processing"]
  }
}
```

### **Testing Workflow**

1. **Start your Next.js app** (`npm run dev`)

2. **Open SSE demo page** at `http://localhost:3000/sse-demo`

3. **Click "Connect"** to establish SSE connection

4. **Get connection stats** in Postman (GET request) to verify connection

5. **Send test events** using POST requests with different payloads

6. **Watch real-time updates** in the demo page

7. **Monitor connection health** by checking `lastPing` timestamps

### **Expected Response Format**

Successful event sending returns:

```json
{
  "success": true,
  "result": true,
  "event": {
    "type": "notification",
    "message": "Your upload is complete!",
    "data": {
      "uploadId": "abc123"
    }
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "User ID is required for notifications"
}
```

### **Advanced Testing**

#### **Test Multiple Users**

1. Open multiple browser tabs with different `userId` parameters
2. Send targeted events to specific users
3. Verify only the intended user receives the event

#### **Test Connection Cleanup**

1. Connect multiple clients
2. Close browser tabs
3. Check connection stats - should see decreased active connections

#### **Test Heartbeat System**

1. Connect to SSE
2. Wait 30+ seconds
3. Check browser console for ping events
4. Verify `lastPing` updates in connection stats

### **cURL Examples**

If you prefer command line testing:

```bash
# Get connection stats
curl -X GET http://localhost:3000/api/sse/test

# Send notification
curl -X POST http://localhost:3000/api/sse/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user-123",
    "type": "notification",
    "message": "Hello from cURL!",
    "data": {"source": "command_line"}
  }'

# Send system message
curl -X POST http://localhost:3000/api/sse/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system",
    "message": "System maintenance starting",
    "data": {"severity": "high"}
  }'
```

### **Troubleshooting API Tests**

- **"User ID is required"**: Include `userId` in POST body for user-specific events
- **No active connections**: Make sure demo page is open and connected
- **Events not received**: Check browser console for connection errors
- **Session is null**: Use `userId` query parameter as fallback in SSE connection

## Integration Examples

### Webhook Integration

The SSE system integrates seamlessly with webhook handlers:

```typescript
// In webhook handler (e.g., Mux video processing)
import { integrations } from "@/features/sse";

export async function POST(request: NextRequest) {
  const event = await validateWebhookEvent(request);

  switch (event.type) {
    case "video.upload.completed":
      await integrations.video.uploadCompleted(
        event.data.userId,
        event.data.videoId,
      );
      break;

    case "video.upload.failed":
      await integrations.video.uploadFailed(
        event.data.userId,
        event.data.videoId,
        event.data.error,
      );
      break;
  }
}
```

### TRPC Integration

```typescript
// In TRPC router
import { notifications } from "@/features/sse";

export const userRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Update profile logic
      await updateUserProfile(ctx.user.id, input);

      // Send SSE notification
      await notifications.success(ctx.user.id, "Profile updated successfully");
    }),
});
```

## Best Practices

1. **User Identification**: Always include user ID in SSE connections for targeted notifications
2. **Error Handling**: Implement proper error handling and fallback mechanisms
3. **Resource Management**: Properly clean up connections on client disconnect
4. **Event Naming**: Use consistent, descriptive event names (e.g., `video.upload.completed`)
5. **Payload Structure**: Keep event payloads consistent and well-typed
6. **Rate Limiting**: Consider implementing rate limiting for high-frequency events
7. **Monitoring**: Monitor connection counts and system performance

## Troubleshooting

### Common Issues

1. **Connection Drops**: Check network stability and heartbeat configuration
2. **Memory Leaks**: Ensure proper cleanup of event listeners and connections
3. **High CPU Usage**: Monitor heartbeat frequency and connection count
4. **Type Errors**: Verify event payload schemas and type definitions

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// Check connection status
const stats = sseService.getConnectionStats();
console.log("SSE Statistics:", stats);

// Monitor active clients
const clients = sseService.getActiveClients();
console.log("Active clients:", clients);
```
