# Server-Sent Events (SSE) Implementation

This directory contains a comprehensive Server-Sent Events (SSE) implementation for real-time, server-to-client notifications across the application.

## Overview

The SSE layer provides:
- **Centralized connection management** - Track active client connections per user/session
- **Flexible event routing** - Send events to specific users, sessions, topics, or broadcast to all
- **Automatic heartbeat** - Keep connections alive with periodic ping messages
- **Comprehensive error handling** - Graceful handling of disconnections and errors
- **Real-time monitoring** - Statistics and connection tracking
- **Clean API** - Easy integration for backend modules

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client (UI)   │    │   SSE Manager   │    │   Event Bus     │
│                 │    │                 │    │                 │
│ EventSource     │◄──►│ ConnectionMgr   │◄──►│ InMemoryBus     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   tRPC API      │
                       │                 │
                       │ SSE Endpoints   │
                       └─────────────────┘
```

## Core Components

### 1. Connection Manager (`manager.ts`)
- Manages active SSE connections
- Handles connection lifecycle (connect, disconnect, errors)
- Provides statistics and monitoring
- Implements automatic heartbeat mechanism

### 2. Event Bus (`bus.ts`)
- Abstract event publishing/subscribing system
- In-memory implementation for single-server deployments
- Redis implementation available for multi-server scaling

### 3. Types (`types.ts`)
- Comprehensive type definitions
- Connection information interfaces
- Error handling types
- Statistics interfaces

### 4. API Layer (`index.ts`)
- High-level API functions for sending events
- Utility functions for common notification patterns
- Management and monitoring functions

## Quick Start

### 1. Connect from Client

```typescript
// Basic SSE connection
const eventSource = new EventSource("/api/sse?topic=notifications,updates", {
  withCredentials: true
});

// Listen for events
eventSource.addEventListener("message", (e) => {
  console.log("Received:", e.data);
});

eventSource.addEventListener("welcome", (e) => {
  const data = JSON.parse(e.data);
  console.log("Connected with ID:", data.connId);
});

// Handle errors
eventSource.addEventListener("error", (e) => {
  console.error("SSE error:", e);
});
```

### 2. Send Events from Server

```typescript
import { notifyUser, broadcast, notifyTopic } from "@/server/sse";

// Send to specific user
await notifyUser("user123", "new_message", {
  message: "Hello!",
  timestamp: Date.now()
});

// Broadcast to all connected clients
await broadcast("system_update", {
  message: "Server maintenance in 5 minutes",
  type: "warning"
});

// Send to topic subscribers
await notifyTopic("live-scores", "score_update", {
  team: "Home Team",
  score: 2
});
```

## API Reference

### Core Functions

#### `notifyUser(userId: string, event: string, data: any)`
Send an event to all connections of a specific user.

#### `notifySession(sessionId: string, event: string, data: any)`
Send an event to a specific browser session/tab.

#### `notifyTopic(topic: string, event: string, data: any)`
Send an event to all clients subscribed to a topic.

#### `broadcast(event: string, data: any)`
Send an event to all connected clients.

#### `notifyConnection(connId: string, event: string, data: any)`
Send an event to a specific connection.

### Utility Functions

#### `notifyNewMessage(userId: string, message: any)`
Send a new message notification to a user.

#### `notifySystemUpdate(event: string, data: any)`
Broadcast a system update to all clients.

#### `notifyUserStatus(userId: string, status: string)`
Notify about user status changes.

#### `notifyLiveUpdate(topic: string, data: any)`
Send live data updates to topic subscribers.

### Management Functions

#### `getStats(): SseStats`
Get comprehensive SSE statistics.

#### `getConnectionInfo(connId: string): ConnectionInfo | null`
Get information about a specific connection.

#### `getUserConnections(userId: string): ConnectionInfo[]`
Get all connections for a user.

#### `getTopicConnections(topic: string): ConnectionInfo[]`
Get all connections for a topic.

#### `cleanup(): Promise<void>`
Clean up all connections (useful for graceful shutdown).

#### `healthCheck()`
Get health status of the SSE system.

## Integration Examples

### Webhook Handler Integration

```typescript
// In a webhook handler
export async function POST(req: Request) {
  const payload = await req.json();
  
  // Process webhook
  const result = await processWebhook(payload);
  
  // Notify relevant users
  if (result.userId) {
    await notifyUser(result.userId, "webhook_processed", {
      type: payload.type,
      status: "success",
      timestamp: Date.now()
    });
  }
  
  return Response.json({ success: true });
}
```

### Background Job Integration

```typescript
// In a background job processor
export async function processJob(jobData: any) {
  try {
    const result = await performJob(jobData);
    
    // Notify user about job completion
    await notifyUser(jobData.userId, "job_completed", {
      jobId: jobData.id,
      result,
      timestamp: Date.now()
    });
    
  } catch (error) {
    // Notify about job failure
    await notifyUser(jobData.userId, "job_failed", {
      jobId: jobData.id,
      error: error.message,
      timestamp: Date.now()
    });
  }
}
```

### Real-time Chat Integration

```typescript
// In a chat message handler
export async function sendMessage(message: ChatMessage) {
  // Save message to database
  const savedMessage = await saveMessage(message);
  
  // Notify all users in the room
  await notifyTopic(`chat:${message.roomId}`, "new_message", {
    message: savedMessage,
    timestamp: Date.now()
  });
  
  // Notify sender about delivery
  await notifyUser(message.senderId, "message_sent", {
    messageId: savedMessage.id,
    timestamp: Date.now()
  });
}
```

## Monitoring and Debugging

### SSE Statistics

The system provides comprehensive statistics:

```typescript
const stats = getStats();
console.log({
  activeConnections: stats.activeConnections,
  totalEventsSent: stats.totalEventsSent,
  totalErrors: stats.totalErrors,
  uptime: stats.uptime,
  connectionsByUser: stats.connectionsByUser,
  connectionsByTopic: stats.connectionsByTopic
});
```

### Connection Monitoring

```typescript
// Get all connections for a user
const userConnections = getUserConnections("user123");
console.log(`User has ${userConnections.length} active connections`);

// Get all connections for a topic
const topicConnections = getTopicConnections("live-scores");
console.log(`Topic has ${topicConnections.length} subscribers`);
```

### Health Check

```typescript
const health = healthCheck();
console.log({
  status: health.status,
  activeConnections: health.activeConnections,
  uptime: health.uptime
});
```

## Error Handling

The SSE system includes comprehensive error handling:

### Connection Errors
- Automatic reconnection with exponential backoff
- Error logging and monitoring
- Graceful cleanup of failed connections

### Event Delivery Errors
- Failed event delivery is logged
- Connection status tracking
- Automatic retry mechanisms

### Server Errors
- Graceful degradation
- Error reporting to monitoring systems
- Automatic recovery

## Scaling Considerations

### Single Server (Current Implementation)
- Uses in-memory event bus
- Suitable for small to medium applications
- All connections handled by single process

### Multi-Server Scaling
- Switch to Redis event bus for horizontal scaling
- Multiple server instances can share connections
- Load balancing across SSE endpoints

```typescript
// For production scaling, replace InMemoryBus with RedisBus
import { RedisBus } from "./bus";
import Redis from "ioredis";

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);
const bus = new RedisBus(sub, pub);
export const sse = new ConnectionManager(bus);
```

## Security Considerations

### Authentication
- SSE connections require valid session
- User-specific event routing
- Session-based access control

### Rate Limiting
- Implement rate limiting on SSE endpoints
- Prevent abuse and resource exhaustion
- Monitor connection patterns

### Data Validation
- Validate all event data before sending
- Sanitize user inputs
- Implement proper error boundaries

## Testing

### Demo Interface
Visit `/sse-demo` to test all SSE functionality:
- Connection status monitoring
- Event sending and receiving
- Statistics and metrics
- Different event types and routing

### Automated Testing
```typescript
// Example test
describe("SSE", () => {
  it("should send events to connected clients", async () => {
    // Setup SSE connection
    const eventSource = new EventSource("/api/sse");
    
    // Send test event
    await notifyUser("test-user", "test", { message: "Hello" });
    
    // Verify event received
    // ... test assertions
  });
});
```

## Best Practices

1. **Use appropriate event types** - Choose the right routing method for your use case
2. **Handle reconnections** - Implement proper reconnection logic in clients
3. **Monitor performance** - Track connection counts and event volumes
4. **Clean up resources** - Properly close connections when components unmount
5. **Error boundaries** - Implement error handling for SSE failures
6. **Rate limiting** - Prevent abuse of SSE endpoints
7. **Logging** - Log important events for debugging and monitoring

## Troubleshooting

### Common Issues

1. **Connections not receiving events**
   - Check user authentication
   - Verify topic subscriptions
   - Check connection status

2. **High memory usage**
   - Monitor connection counts
   - Implement connection limits
   - Check for connection leaks

3. **Events not being sent**
   - Verify SSE manager is initialized
   - Check event bus configuration
   - Review error logs

### Debug Commands

```typescript
// Check connection status
const stats = getStats();
console.log("Active connections:", stats.activeConnections);

// Check specific user connections
const userConnections = getUserConnections("user123");
console.log("User connections:", userConnections);

// Test event sending
await notifyUser("user123", "test", { message: "Debug test" });
```

## Performance Optimization

1. **Connection pooling** - Reuse connections when possible
2. **Event batching** - Batch multiple events when appropriate
3. **Selective subscriptions** - Only subscribe to necessary topics
4. **Connection limits** - Implement per-user connection limits
5. **Memory monitoring** - Track memory usage and connection counts

This SSE implementation provides a robust foundation for real-time features in your application. The modular design allows for easy extension and customization based on your specific requirements.
