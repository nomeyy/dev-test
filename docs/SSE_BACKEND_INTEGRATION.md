# SSE Backend Integration Guide

## Overview

This document provides comprehensive guidance for integrating with the centralized Server-Sent Events (SSE) system. The system provides real-time notifications, connection management, heartbeat monitoring, and event dispatching capabilities.

## Architecture

### Core Components

The SSE system now uses a **modular architecture** with specialized managers:

1. **OptimizedSSEService** (`/lib/sse/sse-service-optimized.ts`) - Main service coordinating all operations
2. **ConnectionManager** (`/lib/sse/connection-manager.ts`) - Client connection lifecycle and event dispatch
3. **HeartbeatManager** (`/lib/sse/heartbeat-manager.ts`) - Heartbeat monitoring and client health
4. **StatsManager** (`/lib/sse/stats-manager.ts`) - Statistics collection and health monitoring
5. **SSELogger** (`/lib/sse/logger.ts`) - Structured logging system
6. **Types** (`/lib/sse/types.ts`) - Centralized type definitions
7. **API Endpoints** (`/app/api/sse/`) - HTTP interfaces for SSE operations
8. **Utilities** (`/app/api/sse/utils.ts`) - Shared helper functions
9. **Index** (`/lib/sse/index.ts`) - Centralized exports

## Quick Start

### 1. Import the SSE Service

```typescript
// Import the main service (recommended)
import { sseService } from "@/lib/sse";

// Or import specific managers for advanced usage
import {
  sseService,
  ConnectionManager,
  HeartbeatManager,
  StatsManager,
  sseLogger,
} from "@/lib/sse";
```

### 2. Send Events to Clients

```typescript
// Send to specific client
const success = sseService.sendToClient("client-123", {
  type: "notification",
  data: { message: "Hello World!" },
});

// Send to all clients of a user
const sentCount = sseService.sendToUser("user-456", {
  type: "user-update",
  data: { status: "online" },
});

// Send to all clients in a session
const sentCount = sseService.sendToSession("session-789", {
  type: "session-event",
  data: { action: "refresh" },
});

// Broadcast to all connected clients
const sentCount = sseService.broadcast({
  type: "system-announcement",
  data: { message: "System maintenance in 5 minutes" },
});
```

### 3. Using the HTTP API

Send events via HTTP POST to `/api/sse/send`:

```typescript
const response = await fetch("/api/sse/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    target: "user", // 'client', 'user', 'session', 'broadcast', 'all'
    targetId: "user-123", // Required for client/user/session targets
    event: {
      type: "notification",
      data: { message: "Hello!" },
    },
  }),
});

const result = await response.json();
console.log(`Sent to ${result.sentCount} clients`);
```

## Modular Architecture Details

### ConnectionManager

Handles client connection lifecycle, tracking, and event dispatch:

- Client registration and removal
- User/session-based client grouping
- Event broadcasting to targeted clients
- Disconnect handler management

### HeartbeatManager

Manages client health monitoring:

- Periodic heartbeat sending
- Client timeout detection
- Stale client cleanup
- Ping response tracking

### StatsManager

Collects and broadcasts system statistics:

- Real-time connection metrics
- Heartbeat health status
- Performance monitoring
- Threshold-based alerts

## API Reference

### Main SSE Service Methods

#### Connection Management

```typescript
// Get connection statistics
const stats = sseService.getStats();
// Returns: { totalClients, uniqueUsers, uniqueSessions, heartbeat }

// Get client information
const client = sseService.getClient("client-id");

// Check if client exists
const exists = sseService.hasClient("client-id");

// Remove client connection
sseService.removeClient("client-id", "reason");
```

#### Event Dispatching

```typescript
// Send to specific client (returns boolean)
sseService.sendToClient(clientId: string, event: SSEEvent): boolean

// Send to all clients of a user (returns count)
sseService.sendToUser(userId: string, event: SSEEvent): number

// Send to all clients in a session (returns count)
sseService.sendToSession(sessionId: string, event: SSEEvent): number

// Broadcast to all clients (returns count)
sseService.broadcast(event: SSEEvent): number
```

#### Heartbeat Management

```typescript
// Update client ping timestamp
sseService.updateClientPing(clientId: string): void

// Get heartbeat configuration
const config = sseService.getHeartbeatConfig();
// Returns: { enabled, interval, timeout }

// Get heartbeat statistics
const stats = sseService.getHeartbeatStats();
// Returns: { totalPings, activePings, timeouts, lastPing }
```

### Event Structure

```typescript
interface SSEEvent {
  type: string; // Event type identifier
  data: unknown; // Event payload (will be JSON stringified)
}
```

### Target Types

- **`client`** - Send to specific client by clientId
- **`user`** - Send to all clients connected by userId
- **`session`** - Send to all clients in sessionId
- **`broadcast`** / **`all`** - Send to all connected clients

## HTTP API Endpoints

### GET /api/sse

Establishes SSE connection for clients.

**Query Parameters:**

- `userId` (optional) - User identifier
- `sessionId` (optional) - Session identifier

**Example:**

```
GET /api/sse?userId=user-123&sessionId=session-456
```

### POST /api/sse/send

Send events to connected clients.

**Request Body:**

```json
{
  "target": "user",
  "targetId": "user-123",
  "event": {
    "type": "notification",
    "data": { "message": "Hello!" }
  }
}
```

**Response:**

```json
{
  "success": true,
  "sentCount": 2,
  "target": "user",
  "targetId": "user-123",
  "event": { "type": "notification", "data": { "message": "Hello!" } },
  "stats": { "totalClients": 5, "uniqueUsers": 3, "uniqueSessions": 2 }
}
```

### GET/POST /api/sse/heartbeat

Handle client heartbeat pings and get heartbeat configuration.

**GET Response:**

```json
{
  "enabled": true,
  "interval": 30000,
  "timeout": 60000,
  "stats": {
    "totalPings": 1250,
    "activePings": 5,
    "timeouts": 2,
    "lastPing": "2024-01-15T10:30:00.000Z"
  }
}
```

**POST Request:**

```json
{
  "clientId": "client-123",
  "timestamp": 1705312200000
}
```

## Integration Examples

### Express.js Middleware

```typescript
import { sseService } from "@/lib/sse/sse-service";

app.post("/api/notify-user", (req, res) => {
  const { userId, message } = req.body;

  const sentCount = sseService.sendToUser(userId, {
    type: "notification",
    data: { message, timestamp: Date.now() },
  });

  res.json({ success: true, sentCount });
});
```

### Database Change Notifications

```typescript
import { sseService } from "@/lib/sse/sse-service";

// After database update
async function updateUserProfile(userId: string, data: any) {
  // Update database
  await db.users.update(userId, data);

  // Notify connected clients
  sseService.sendToUser(userId, {
    type: "profile-updated",
    data: { userId, changes: data },
  });
}
```

### System Announcements

```typescript
import { sseService } from "@/lib/sse/sse-service";

// Broadcast system-wide messages
function announceSystemMaintenance(message: string, scheduledTime: Date) {
  sseService.broadcast({
    type: "system-announcement",
    data: {
      message,
      scheduledTime: scheduledTime.toISOString(),
      severity: "warning",
    },
  });
}
```

## Error Handling

The SSE service includes comprehensive error handling and logging:

```typescript
import { sseLogger } from "@/lib/sse/logger";

// All operations are logged automatically
const success = sseService.sendToClient("client-123", event);

if (!success) {
  sseLogger.warn("MyComponent", "Failed to send event to client", {
    clientId: "client-123",
    eventType: event.type,
  });
}

// Get recent error logs
const errorLogs = sseLogger.getErrorLogs(10);
```

## Best Practices

### 1. Event Naming Convention

Use descriptive, hierarchical event types:

```typescript
// Good
{ type: 'user.profile.updated', data: {...} }
{ type: 'chat.message.received', data: {...} }
{ type: 'system.maintenance.scheduled', data: {...} }

// Avoid
{ type: 'update', data: {...} }
{ type: 'msg', data: {...} }
```

### 2. Data Structure

Keep event data structured and consistent:

```typescript
// Good
{
  type: 'notification',
  data: {
    id: 'notif-123',
    title: 'New Message',
    body: 'You have a new message',
    timestamp: '2024-01-15T10:30:00.000Z',
    actions: [{ label: 'View', url: '/messages' }]
  }
}
```

### 3. Error Handling

Always check return values and handle failures:

```typescript
const sentCount = sseService.sendToUser(userId, event);

if (sentCount === 0) {
  // User not connected, maybe store for later delivery
  await storeNotificationForLater(userId, event);
}
```

### 4. Resource Management

Monitor connection statistics and implement limits:

```typescript
const stats = sseService.getStats();

if (stats.totalClients > 1000) {
  sseLogger.warn("SSE Monitor", "High client count detected", {
    totalClients: stats.totalClients,
  });
}
```

## Monitoring and Debugging

### Connection Statistics

```typescript
const stats = sseService.getStats();
console.log(`
  Total Clients: ${stats.totalClients}
  Unique Users: ${stats.uniqueUsers}
  Unique Sessions: ${stats.uniqueSessions}
  Heartbeat Enabled: ${stats.heartbeat.enabled}
  Active Pings: ${stats.heartbeat.activePings}
`);
```

### Logging

```typescript
import { sseLogger } from "@/lib/sse/logger";

// Get recent logs
const recentLogs = sseLogger.getRecentLogs(50);

// Get logs for specific client
const clientLogs = sseLogger.getClientLogs("client-123");

// Get error logs only
const errorLogs = sseLogger.getErrorLogs(20);
```

### Test Dashboard

Visit `/sse-test` for a comprehensive testing interface that allows you to:

- Monitor real-time connection statistics
- Send test events to specific targets
- View heartbeat status and metrics
- Monitor connection lifecycle events
- Test different event types and payloads

## Performance Considerations

1. **Event Size**: Keep event payloads reasonably small (< 64KB recommended)
2. **Frequency**: Avoid sending events too frequently (< 10/second per client)
3. **Client Limits**: Monitor total client count and implement limits if needed
4. **Memory Usage**: The service keeps recent logs in memory; configure retention as needed

## Security Notes

1. **Authentication**: Implement proper authentication before establishing SSE connections
2. **Authorization**: Validate user permissions before sending targeted events
3. **Rate Limiting**: Implement rate limiting on the send endpoint to prevent abuse
4. **Input Validation**: Always validate event data before sending

## Troubleshooting

### Common Issues

1. **Events not received**: Check client connection status and target parameters
2. **High memory usage**: Review log retention settings and client cleanup
3. **Connection drops**: Monitor heartbeat settings and network stability
4. **Performance issues**: Check event frequency and payload sizes

### Debug Mode

Set `NODE_ENV=development` to enable debug logging:

```typescript
// Debug logs will show detailed connection and event information
sseLogger.debug("Component", "Detailed debug info", { context });
```
