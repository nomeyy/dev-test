# Server-Sent Events (SSE) Implementation

This directory contains a comprehensive Server-Sent Events (SSE) implementation for real-time, server-to-client notifications in the Next.js application.

## Overview

The SSE system provides:
- **Real-time notifications** from server to client
- **Connection management** with automatic reconnection
- **User-specific messaging** and broadcast capabilities
- **Heartbeat mechanism** to keep connections alive
- **Progress tracking** for long-running operations
- **Clean API** for backend integration

## Architecture

```
src/lib/sse/
├── types.ts          # TypeScript type definitions
├── server.ts         # SSE server manager
├── client.ts         # React hook for client-side SSE
├── index.ts          # Main exports
└── README.md         # This documentation
```

## Features

### ✅ Implemented
- [x] SSE endpoint (`/api/sse`) with authentication
- [x] Client connection management
- [x] User-specific messaging
- [x] Broadcast messaging
- [x] Automatic reconnection
- [x] Heartbeat/ping mechanism
- [x] Progress tracking for reports
- [x] React hook for easy integration
- [x] Notification components
- [x] Demo page with examples
- [x] Error handling and logging

## Quick Start

### 1. Client-Side Usage

```tsx
import { useSSE } from '@/lib/sse/client';

function MyComponent() {
  const { connectionState, events, lastEvent } = useSSE();

  return (
    <div>
      <p>Status: {connectionState.isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Events received: {events.length}</p>
      {lastEvent && (
        <p>Latest: {lastEvent.event} - {lastEvent.data.message}</p>
      )}
    </div>
  );
}
```

### 2. Using the Notification Component

```tsx
import { SSENotification } from '@/features/shared/components/ui/sse-notification';

function MyPage() {
  return (
    <div>
      <h1>My Dashboard</h1>
      <SSENotification 
        showConnectionStatus={true}
        maxNotifications={5}
      />
    </div>
  );
}
```

### 3. Backend Integration

```typescript
import { sseUtils } from '@/lib/sse/server';

// Send a notification to a specific user
sseUtils.sendNotification(
  userId,
  'Report Ready',
  'Your monthly report is ready for download',
  'success'
);

// Send a report status update
sseUtils.sendReportUpdate(
  userId,
  reportId,
  'generating',
  'Processing data...',
  45
);

// Broadcast to all connected clients
sseUtils.broadcast('notification', {
  title: 'System Maintenance',
  message: 'Scheduled maintenance in 5 minutes',
  type: 'warning'
});
```

## API Reference

### SSE Server (`server.ts`)

#### `sseServer`
Main SSE server instance that manages all client connections.

#### `sseUtils`
Utility functions for common SSE operations:

- `sendNotification(userId, title, message, type?)` - Send notification to user
- `sendReportUpdate(userId, reportId, status, message, progress?, downloadUrl?, error?)` - Send report status
- `broadcast(event, data)` - Broadcast to all clients
- `getStats()` - Get connection statistics

### Client Hook (`client.ts`)

#### `useSSE()`
React hook that manages SSE connection and provides:

```typescript
interface UseSSEReturn {
  connectionState: SSEConnectionState;
  events: SSEEventData[];
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
  lastEvent: SSEEventData | null;
}
```

### Types (`types.ts`)

#### Event Types
```typescript
type SSEEventType = 
  | 'report.generating'
  | 'report.completed'
  | 'report.failed'
  | 'notification'
  | 'ping'
  | 'error';
```

#### Report Event
```typescript
interface ReportEvent {
  reportId: string;
  status: 'generating' | 'completed' | 'failed';
  message: string;
  progress?: number;
  downloadUrl?: string;
  error?: string;
}
```

## API Endpoints

### `/api/sse`
**GET** - Establishes SSE connection
- Requires authentication
- Returns streaming response with real-time events

### `/api/sse/test-notification`
**POST** - Send test notification to current user
```json
{
  "title": "Test Title",
  "message": "Test message",
  "type": "info"
}
```

### `/api/sse/broadcast`
**POST** - Broadcast message to all connected clients
```json
{
  "event": "notification",
  "data": {
    "title": "Broadcast Title",
    "message": "Broadcast message",
    "type": "info"
  }
}
```

### `/api/reports/generate`
**POST** - Start report generation with SSE progress updates
```json
{
  "reportType": "monthly",
  "parameters": {
    "dateRange": "last-30-days",
    "includeCharts": true
  }
}
```

## Demo Page

Visit `/sse-demo` to see the SSE system in action with:
- Connection status display
- Test notification buttons
- Report generation simulation
- Real-time event log
- Notification display

## Integration Examples

### 1. Report Generation Workflow

```typescript
// 1. Start report generation
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  body: JSON.stringify({ reportType: 'monthly' })
});

// 2. User receives real-time updates via SSE:
// - "Report generation started" (0%)
// - "Gathering data..." (25%)
// - "Processing..." (50%)
// - "Generating charts..." (75%)
// - "Report ready!" (100%)

// 3. User can continue using the app while report generates
```

### 2. Notification System

```typescript
// Send different types of notifications
sseUtils.sendNotification(userId, 'Success!', 'Operation completed', 'success');
sseUtils.sendNotification(userId, 'Warning', 'Please check your data', 'warning');
sseUtils.sendNotification(userId, 'Error', 'Something went wrong', 'error');
```

### 3. Broadcast Messages

```typescript
// Send system-wide announcements
sseUtils.broadcast('notification', {
  title: 'System Update',
  message: 'New features available!',
  type: 'info'
});
```

## Configuration

### Heartbeat Settings
```typescript
// In server.ts
private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
private readonly CLIENT_TIMEOUT = 120000; // 2 minutes
```

### Reconnection Settings
```typescript
// In client.ts
const maxReconnectAttempts = 5;
const reconnectDelay = 1000; // Start with 1 second
```

## Best Practices

1. **Always handle connection state** - Check `connectionState.isConnected` before sending messages
2. **Use appropriate event types** - Use specific event types for different notifications
3. **Include progress for long operations** - Provide progress updates for better UX
4. **Handle errors gracefully** - Implement proper error handling and fallbacks
5. **Clean up connections** - Ensure connections are properly closed on component unmount

## Troubleshooting

### Common Issues

1. **Connection not established**
   - Check authentication
   - Verify SSE endpoint is accessible
   - Check browser console for errors

2. **Messages not received**
   - Verify user ID matches
   - Check event type names
   - Ensure proper JSON formatting

3. **Connection drops frequently**
   - Check network stability
   - Verify heartbeat settings
   - Check server logs for errors

### Debug Mode

Enable debug logging by checking browser console for SSE-related messages:
- Connection events
- Message parsing errors
- Reconnection attempts

## Security Considerations

- All SSE connections require authentication
- User-specific messages are filtered by user ID
- No sensitive data should be sent via SSE
- Implement rate limiting for broadcast messages
- Validate all message data before sending

## Performance Notes

- SSE connections are lightweight
- Heartbeat messages are minimal
- Automatic cleanup prevents memory leaks
- Reconnection uses exponential backoff
- Connection pooling is handled automatically 