# Server-Sent Events (SSE) Implementation

A Server-Sent Events (SSE) system with heartbeat mechanism, connection management, and real-time event broadcasting. Built with T3 Stack principles, clean architecture, type safety, and modular design.

## Features

- Real-time SSE connectivity with heartbeat mechanism
- Automatic reconnection with exponential backoff
- Clean React hooks API for client-side integration
- Connection state management and monitoring
- Active client tracking and management
- Real-time client count updates
- Targeted message delivery and broadcasting
- Type-safe tRPC endpoints for event sending

## Core Components

### 1. State Management (`server/state.ts`)

- Centralized SSE client state management
- Heartbeat mechanism (15s interval)
- Client timeout handling (45s threshold)
- Automatic cleanup of stale connections

### 2. tRPC Integration (`server/router.ts`)

- Type-safe event sending endpoints
- Active client querying
- Error handling with proper tRPC error codes

### 3. Client Hook (`hooks/useSSE.ts`)

- React hook for SSE consumption
- Connection state management
- Automatic reconnection logic
- Event sending utilities

### 4. Stream Endpoint (`/app/api/sse/route.ts`)

- SSE stream initialization
- Client registration
- Connection cleanup

## Error Handling

### Client-side

- Automatic reconnection with exponential backoff
- Connection state monitoring
- Heartbeat tracking
- Proper cleanup on unmount

### Server-side

- Stale connection cleanup
- Failed heartbeat tracking
- Resource cleanup
- Type-safe error responses

## Testing

The implementation can be tested using the SSE demo page at `/sse-demo`.

### Test Scenarios

1. **Connection Management**
   - Initial connection establishment
   - Heartbeat reception
   - Automatic reconnection on failure
   - Manual disconnection

2. **Event Handling**
   - Broadcast messages
   - Targeted messages
   - Connection status updates
   - Client count updates

3. **Error Scenarios**
   - Network interruption recovery
   - Server disconnect handling
   - Invalid message handling

## Performance Considerations

- Efficient client tracking with Map data structure
- Minimal memory footprint per connection
- Proper resource cleanup
- Optimized message broadcasting

## Security

- No sensitive data in SSE messages
- Client validation on connection
- Resource limits per client
- Proper error handling to prevent information leakage

## Dependencies

- Next.js App Router
- tRPC
- Zod for validation
- Custom logger implementation
