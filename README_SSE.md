# SSE Notification System

A comprehensive Server-Sent Events (SSE) implementation for real-time notifications in Next.js applications.

## 🚀 Quick Start

### Main Interface

Visit the SSE Notification System at: **`http://localhost:3001/sse-notification-system`**

This is the main interface for testing and demonstrating the SSE functionality.

## 📋 Features

- ✅ **Real-time messaging** - Instant server-to-client communication
- ✅ **Connection management** - Track client connections and handle disconnects
- ✅ **Event targeting** - Send to all clients or specific clients
- ✅ **Heartbeat system** - Automatic ping messages to keep connections alive
- ✅ **Event logging** - Real-time event history with timestamps
- ✅ **Connection statistics** - Live monitoring of connected clients
- ✅ **Error handling** - Comprehensive error recovery and logging

## 🏗️ Architecture

### Core Components

- **`src/lib/sse.ts`** - SSE Manager with client tracking and event dispatching
- **`src/lib/sse-utils.ts`** - Utility functions for backend integration
- **`src/app/api/sse/`** - API endpoints for SSE operations

### API Endpoints

- **`GET /api/sse`** - SSE connection endpoint
- **`POST /api/sse/test`** - Send test events
- **`POST /api/sse/ping`** - Send manual pings
- **`GET /api/sse/status`** - Get connection statistics

## 🎯 Usage

### Frontend Integration

```typescript
const eventSource = new EventSource("/api/sse");

eventSource.addEventListener("notification", (event) => {
  const data = JSON.parse(event.data);
  console.log("Received notification:", data);
});
```

### Backend Integration

```typescript
import { SSE } from "@/lib/sse";

// Send to all clients
SSE.broadcast("notification", { message: "Hello everyone!" });

// Send to specific user
SSE.toUser("user123", "update", { status: "completed" });

// Send to specific client
SSE.toClient("client456", "alert", { message: "Important alert!" });
```

## 🔧 Configuration

The system includes:

- **Connection limits** - Maximum 1000 clients, 5 per user
- **Heartbeat interval** - 30 seconds automatic pings
- **Client timeout** - 2 minutes inactive timeout
- **Rate limiting** - SSE routes excluded from rate limiting

## 📊 Monitoring

- **Real-time statistics** - Total clients, unique users, sessions
- **Event logging** - All events with timestamps and data
- **Connection status** - Live connection indicators
- **Error tracking** - Comprehensive error logging

## 🎨 Interface Features

The main interface at `/sse-notification-system` provides:

- **Connection controls** - Connect, disconnect, reconnect
- **Event targeting** - Broadcast or specific client selection
- **Message sending** - Custom messages with different event types
- **Real-time logging** - Color-coded event history
- **Statistics display** - Live connection metrics

## 🚀 Production Ready

This SSE implementation is production-ready with:

- ✅ **Scalable architecture** - Handles multiple concurrent connections
- ✅ **Error recovery** - Automatic client cleanup and reconnection
- ✅ **Security** - Connection limits and validation
- ✅ **Performance** - Efficient event dispatching and memory management
- ✅ **Monitoring** - Comprehensive logging and statistics

## 🎯 Getting Started

1. **Start the server**: `npm run dev`
2. **Visit the interface**: `http://localhost:3001/sse-notification-system`
3. **Test functionality**: Use the interface to send events and monitor connections
4. **Integrate**: Use the provided code examples for your own applications
