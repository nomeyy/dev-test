# SSE (Server-Sent Events) Feature

This feature provides a complete Server-Sent Events implementation for real-time, server-to-client notifications across the app.

## Features

- ✅ **Centralized SSE Manager**: Tracks active client connections
- ✅ **Event Broadcasting**: Send events to specific clients, users, or broadcast to all
- ✅ **Connection Lifecycle**: Handles connect, disconnect, and error states
- ✅ **Heartbeat Mechanism**: Keeps connections alive with ping messages
- ✅ **Resource Cleanup**: Proper cleanup on disconnect to prevent leaks
- ✅ **React Integration**: Hooks and context providers for easy frontend usage
- ✅ **Backend Utilities**: Service functions for sending events from other parts of the app

## API Endpoints

### GET `/api/sse`

Establishes SSE connection with optional query parameters:

- `userId`: Associate connection with a specific user
- `sessionId`: Associate connection with a session

### POST `/api/sse/test`

Sends test SSE events for testing purposes.

## React Components

### SSEProvider

Context provider that manages SSE connection state.

```tsx
import { SSEProvider } from "@/features/sse";

function App() {
  return (
    <SSEProvider userId="user123">
      <YourApp />
    </SSEProvider>
  );
}
```

### useSSEContext

Hook to access SSE state and controls.

```tsx
import { useSSEContext } from "@/features/sse";

function MyComponent() {
  const { isConnected, lastEvent, events, connect, disconnect } =
    useSSEContext();

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastEvent && <p>Last: {JSON.stringify(lastEvent)}</p>}
    </div>
  );
}
```

### SSETestUI

Complete test interface with connection controls and event display.

### SSEMessageDisplay

Simple component that displays the latest SSE message.

## Backend Integration

### SSEService

Utility class for sending events from backend code.

```typescript
import { SSEService } from "@/features/sse";

// Send notification to specific user
SSEService.sendNotification("user123", "Your reel is ready!", "success");

// Send reel update
SSEService.sendReelUpdate("user123", "reel456", "processing");

// Broadcast system message
SSEService.broadcastSystemMessage("System maintenance in 5 minutes");
```

### Direct Manager Access

For advanced usage, access the SSE manager directly:

```typescript
import { sseManager } from "@/features/sse";

// Send custom event
sseManager.sendToUser("user123", {
  event: "custom-event",
  data: { custom: "data" },
});
```

## Event Types

### Built-in Events

- `connect`: Sent when client connects
- `ping`: Heartbeat messages (every 30 seconds)
- `notification`: User notifications
- `reel-update`: Reel processing updates
- `system-message`: Broadcast system messages

### Custom Events

You can send any custom event with any data structure.

## Testing

Visit `/sse-test` to see the SSE functionality in action:

- Connect/disconnect controls
- Send test events
- View real-time event stream
- Simple message display

## Architecture

```
src/features/sse/
├── components/          # React components
│   ├── SSEProvider.tsx # Context provider
│   ├── SSETestUI.tsx   # Test interface
│   └── SSEMessageDisplay.tsx # Simple display
├── hooks/              # React hooks
│   └── useSSE.tsx      # SSE connection hook
├── services/           # Backend services
│   ├── sse-manager.ts  # Core SSE manager
│   └── sse-service.ts  # Utility service
├── types/              # TypeScript types
│   └── index.ts        # SSE interfaces
└── index.ts            # Public exports
```

## Usage Examples

### Basic Usage

```tsx
import { SSEProvider, SSEMessageDisplay } from "@/features/sse";

function App() {
  return (
    <SSEProvider>
      <SSEMessageDisplay />
    </SSEProvider>
  );
}
```

### Advanced Usage

```tsx
import { useSSEContext } from "@/features/sse";

function NotificationCenter() {
  const { events } = useSSEContext();

  return (
    <div>
      {events.map((event, index) => (
        <div key={index}>
          {event.event}: {JSON.stringify(event.data)}
        </div>
      ))}
    </div>
  );
}
```

### Backend Integration

```typescript
// In a webhook handler
export async function handleReelUpload(userId: string, reelId: string) {
  // Process upload...
  SSEService.sendReelUpdate(userId, reelId, "processing");

  // After processing...
  SSEService.sendReelUpdate(userId, reelId, "completed");
}
```
