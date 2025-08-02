# SSE Test Dashboard Usage Guide

## Overview

The SSE Test Dashboard (`/sse-test`) provides a comprehensive interface for testing and monitoring the Server-Sent Events system. It features real-time connection management, event testing, statistics monitoring, and heartbeat tracking.

## Accessing the Dashboard

Navigate to `/sse-test` in your browser to access the test interface.

## Dashboard Components

### 1. Connection Controls

**Purpose**: Manage SSE connection lifecycle

**Features**:

- **Connect Button**: Establish new SSE connection
- **Disconnect Button**: Close current connection
- **User ID Input**: Optional user identifier for connection
- **Session ID Input**: Optional session identifier for connection

**Usage**:

```
1. Enter optional User ID (e.g., "user-123")
2. Enter optional Session ID (e.g., "session-456")
3. Click "Connect" to establish SSE connection
4. Click "Disconnect" to close connection
```

### 2. Connection Status Panel

**Purpose**: Display current connection state and metadata

**Information Displayed**:

- **Status**: Connected/Disconnected with visual indicators
- **Client ID**: Unique identifier assigned by server
- **User ID**: User identifier (if provided)
- **Session ID**: Session identifier (if provided)
- **Connected Since**: Connection timestamp
- **Connection Duration**: Real-time duration counter

### 3. Server Statistics Panel

**Purpose**: Monitor real-time server connection statistics

**Metrics Displayed**:

- **Total Clients**: Current number of connected clients
- **Unique Users**: Number of distinct users connected
- **Unique Sessions**: Number of distinct sessions active
- **Last Updated**: Timestamp of last statistics update

**Auto-Update**: Statistics refresh automatically when clients connect/disconnect

### 4. Heartbeat Status Panel

**Purpose**: Monitor heartbeat mechanism and health

**Information Displayed**:

- **Enabled**: Whether heartbeat is active (Yes/No)
- **Interval**: Heartbeat ping interval in milliseconds
- **Timeout**: Client timeout threshold in milliseconds
- **Received Pings**: Total number of pings received by server
- **Status Updates**: Number of heartbeat status broadcasts
- **Last Heartbeat**: Timestamp of most recent heartbeat

### 5. Message Sender

**Purpose**: Send test events to various targets

**Controls**:

- **Target Type Dropdown**: Select recipient type
  - `broadcast` - Send to all connected clients
  - `client` - Send to specific client ID
  - `user` - Send to all clients of specific user
  - `session` - Send to all clients in specific session
- **Target ID Input**: Required for client/user/session targets
- **Message Input**: Custom message content
- **Send Button**: Dispatch the test event

**Usage Examples**:

```
Broadcast to all:
- Target: "broadcast"
- Message: "Hello everyone!"

Send to specific user:
- Target: "user"
- Target ID: "user-123"
- Message: "Personal notification"

Send to specific client:
- Target: "client"
- Target ID: "client-abc123"
- Message: "Direct message"
```

### 6. Latest Event Display

**Purpose**: Show the most recently received SSE event

**Information Shown**:

- **Event Type**: The event type identifier
- **Event Data**: JSON payload of the event
- **Timestamp**: When the event was received
- **Auto-Clear**: Clears when connection is closed

### 7. Events Log

**Purpose**: Maintain history of all received events during session

**Features**:

- **Chronological List**: Events shown in order received
- **Event Details**: Type, data, and timestamp for each event
- **Auto-Scroll**: Automatically scrolls to show latest events
- **Clear Button**: Remove all events from log
- **Session Persistence**: Log persists until manually cleared or page refreshed

## Testing Workflows

### Basic Connection Test

1. Open `/sse-test` in browser
2. Click "Connect" (without User/Session IDs)
3. Verify "Connected" status appears
4. Check that Client ID is assigned
5. Observe server statistics update
6. Click "Disconnect" to close

### Multi-User Testing

1. **Tab 1**: Connect with User ID "user-1"
2. **Tab 2**: Connect with User ID "user-2"
3. **Tab 3**: Connect with User ID "user-1" (same user, different client)
4. Observe statistics showing 3 clients, 2 unique users
5. Test user-targeted messages between tabs

### Event Broadcasting Test

1. Connect in multiple browser tabs
2. In one tab, use Message Sender:
   - Target: "broadcast"
   - Message: "Test broadcast message"
   - Click "Send"
3. Verify all tabs receive the event
4. Check Events Log in each tab

### Targeted Messaging Test

1. **Tab 1**: Connect with User ID "alice"
2. **Tab 2**: Connect with User ID "bob"
3. **Tab 3**: Connect with Session ID "session-123"
4. From Tab 1, send user-targeted message:
   - Target: "user"
   - Target ID: "bob"
   - Message: "Hello Bob!"
5. Verify only Tab 2 receives the message

### Heartbeat Monitoring

1. Connect to SSE
2. Monitor Heartbeat Status panel
3. Observe "Received Pings" counter incrementing
4. Check "Last Heartbeat" timestamp updates
5. Test connection stability over time

### Error Testing

1. Try sending to non-existent targets:
   - Target: "user"
   - Target ID: "nonexistent-user"
   - Message: "Test message"
2. Observe error handling in browser console
3. Verify graceful failure behavior

## Advanced Testing Scenarios

### Load Testing

1. Open multiple browser tabs (10+)
2. Connect all tabs with different User IDs
3. Send broadcast messages and monitor performance
4. Check server statistics for accurate counts
5. Monitor browser performance and memory usage

### Connection Resilience

1. Connect to SSE
2. Temporarily disable network connection
3. Re-enable network
4. Verify automatic reconnection (if implemented)
5. Test heartbeat recovery

### Session Management

1. Connect multiple clients with same Session ID
2. Send session-targeted messages
3. Disconnect some clients
4. Verify remaining clients still receive session messages
5. Check statistics update correctly

## Troubleshooting

### Common Issues

**Connection Won't Establish**:

- Check browser console for errors
- Verify server is running on correct port
- Check network connectivity
- Try refreshing the page

**Events Not Received**:

- Verify connection status is "Connected"
- Check target type and target ID are correct
- Monitor browser console for errors
- Verify server logs for event dispatch

**Statistics Not Updating**:

- Check if multiple tabs are open (stats update globally)
- Verify connection is established
- Try reconnecting
- Check server logs for statistics broadcast

**Heartbeat Issues**:

- Monitor heartbeat panel for activity
- Check browser console for heartbeat errors
- Verify server heartbeat configuration
- Test with single connection first

### Debug Information

**Browser Console**: Check for detailed error messages and event logs

**Network Tab**: Monitor SSE connection and HTTP requests

**Server Logs**: Check backend logs for detailed operation information

## UI Components Architecture

The dashboard has been refactored into a **modular React architecture** for improved maintainability:

### File Structure

```
/app/(public)/sse-test/
├── page.tsx              # Main dashboard page
├── types.ts              # TypeScript interfaces
├── utils.ts              # Utility functions
├── components/           # React components
│   ├── ConnectionStatus.tsx
│   ├── LatestEvent.tsx
│   ├── ServerStats.tsx
│   ├── HeartbeatStatus.tsx
│   ├── ConnectionControls.tsx
│   ├── MessageSender.tsx
│   └── EventsLog.tsx
└── hooks/                # Custom React hooks
    ├── useSSEConnection.ts
    ├── useEventLog.ts
    └── useMessageSender.ts
```

### Components

- **`ConnectionStatus`** - Displays connection state, client ID, user/session info, and duration
- **`LatestEvent`** - Shows the most recently received SSE event with formatting
- **`ServerStats`** - Real-time server statistics (clients, users, sessions)
- **`HeartbeatStatus`** - Heartbeat monitoring with detailed metrics
- **`ConnectionControls`** - Connect/disconnect interface with user/session inputs
- **`MessageSender`** - Event sending interface with target selection
- **`EventsLog`** - Scrollable event history with clear functionality

### Custom Hooks

- **`useSSEConnection`** - Manages SSE connection lifecycle, state, and event handling
- **`useEventLog`** - Handles event history storage, filtering, and management
- **`useMessageSender`** - Provides message sending logic with validation and error handling

### Benefits of Modular Architecture

- **Separation of Concerns**: Each component has a single responsibility
- **Reusability**: Components can be used independently or in other contexts
- **Maintainability**: Easier to update, debug, and extend individual features
- **Testing**: Components and hooks can be unit tested in isolation
- **Type Safety**: Centralized types ensure consistency across components
- **Performance**: Optimized re-rendering through focused component updates

## Performance Notes

- **Memory Usage**: Events log accumulates in memory; clear periodically for long test sessions
- **Connection Limits**: Browser typically limits concurrent SSE connections per domain
- **Network Impact**: Multiple tabs create multiple connections; monitor network usage
- **CPU Usage**: Real-time updates may impact performance with many concurrent connections

## Security Considerations

- **Development Only**: This dashboard is intended for development and testing
- **No Authentication**: Dashboard doesn't implement authentication by default
- **Data Exposure**: All connected clients can see server statistics
- **Production Use**: Implement proper security measures before production deployment
