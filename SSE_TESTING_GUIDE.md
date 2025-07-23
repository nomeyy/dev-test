# SSE (Server-Sent Events) Testing Guide

This guide covers how to test the SSE functionality in your Next.js application with comprehensive debugging and monitoring tools.

## 🚀 Quick Start

### 1. **Start Your Development Server**
```bash
npm run dev
```

### 2. **Access the Enhanced Test UI**
Navigate to: `http://localhost:3001/sse-test`

This will show you a complete real-time event monitoring interface with:
- **Real-time connection status** with animated indicators
- **Live event stream** with color-coded event types
- **Event history** (last 20 events) with timestamps and IDs
- **Multiple test buttons** for different event types
- **Raw event display** showing exact SSE format
- **Enhanced error handling** with detailed error messages
- **Client ID tracking** for debugging

### 3. **API Debugging Page**
For troubleshooting API issues, visit: `http://localhost:3001/api-test`

This provides:
- Individual API route testing
- Detailed error reporting
- Response status and headers
- Step-by-step debugging

---

## 🧪 Testing Methods

### **Method 1: Enhanced Web UI (Recommended)**
1. Open `http://localhost:3001/sse-test`
2. Wait for connection to establish (green pulsing dot)
3. Click any test button to send events
4. Watch real-time events appear with full details
5. Expand "Show raw event" to see exact SSE format
6. Monitor connection status and client ID

**New Features:**
- **Color-coded events**: Different colors for each event type
- **Real-time timestamps**: Precise timing for each event
- **Event IDs**: Unique identifiers for tracking
- **Success/Error feedback**: Visual indicators for test results
- **Raw event format**: See exact SSE protocol format

### **Method 2: Browser Console**
```javascript
// Open browser console and run:
const es = new EventSource("/api/sse");

es.onmessage = (e) => console.log("Message:", e.data);
es.addEventListener("notification", (e) => console.log("Notification:", e.data));
es.addEventListener("user_update", (e) => console.log("User Update:", e.data));
es.addEventListener("heartbeat", (e) => console.log("Heartbeat:", e.data));
es.addEventListener("system_message", (e) => console.log("System:", e.data));
es.addEventListener("reel_upload", (e) => console.log("Reel Upload:", e.data));
es.addEventListener("search_result", (e) => console.log("Search Result:", e.data));
es.addEventListener("ping", (e) => console.log("Ping:", e.data));

es.onerror = (e) => console.error("SSE Error:", e);
es.onopen = () => console.log("SSE Connected");
```

### **Method 3: cURL Testing**
```bash
# Test SSE connection (shows real-time events)
curl -N -H "Accept: text/event-stream" http://localhost:3001/api/sse

# Test sending notification events
curl -X POST http://localhost:3001/api/sse/test \
  -H "Content-Type: application/json" \
  -d '{"type":"notification","title":"Test","message":"Hello World","level":"success"}'

# Test different event types
curl -X POST http://localhost:3001/api/sse/test \
  -H "Content-Type: application/json" \
  -d '{"type":"user_update","field":"status","value":"online"}'

curl -X POST http://localhost:3001/api/sse/test \
  -H "Content-Type: application/json" \
  -d '{"type":"reel_upload","reelId":"test-123","status":"processing","progress":75}'
```

### **Method 4: PowerShell Testing (Windows)**
```powershell
# Test GET endpoint
Invoke-WebRequest -Uri "http://localhost:3001/api/sse/test" -Method GET

# Test POST notification
Invoke-WebRequest -Uri "http://localhost:3001/api/sse/test" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"type":"notification","title":"PowerShell Test","message":"Testing from PowerShell","level":"info"}'

# Test user update
Invoke-WebRequest -Uri "http://localhost:3001/api/sse/test" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"type":"user_update","field":"status","value":"online"}'
```

### **Method 5: Using the SSE Client Utility**
```javascript
import { createSSEClient } from "@/features/sse/utils/sse-client";

const client = createSSEClient("/api/sse");

// Listen for all events
client.on("*", (event) => {
  console.log(`SSE Event [${event.type}]:`, event.data);
});

// Listen for specific events
client.on("notification", (event) => {
  console.log("Notification received:", event.data);
});

client.on("heartbeat", (event) => {
  console.log("Heartbeat received:", event.data);
});

client.on("system_message", (event) => {
  console.log("System message:", event.data);
});

// Error handling
client.onError((error) => {
  console.error("SSE Error:", error);
});

client.onOpen(() => {
  console.log("SSE Connected");
});

client.onClose(() => {
  console.log("SSE Disconnected");
});

// Connect to SSE
client.connect().then(() => {
  console.log("Connected to SSE");
}).catch(error => {
  console.error("Failed to connect:", error);
});
```

---

## 📋 Test Scenarios

### **1. Basic Connection Test**
- ✅ Connection establishes with client ID
- ✅ System message received on connect
- ✅ Heartbeat events every 30 seconds
- ✅ Connection status updates in real-time
- ✅ Client ID displayed in UI

### **2. Event Sending Test**
- ✅ Send notification events (yellow)
- ✅ Send user update events (purple)
- ✅ Send reel upload events (orange)
- ✅ Send search result events (indigo)
- ✅ Send system messages (blue)
- ✅ Send ping events (gray)

### **3. Enhanced Error Handling Test**
- ✅ Test with invalid event types
- ✅ Test with missing authentication
- ✅ Test with network interruptions
- ✅ View detailed error messages in UI
- ✅ See error events in event history

### **4. Disconnect/Reconnect Test**
- ✅ Close browser tab → server logs disconnect
- ✅ Refresh page → new connection established
- ✅ Network interruption → automatic reconnection
- ✅ Connection status updates in real-time

### **5. Multiple Clients Test**
- ✅ Open multiple browser tabs
- ✅ Each tab gets its own connection and client ID
- ✅ Events sent to specific user reach all their tabs
- ✅ Independent event histories per tab

### **6. API Debugging Test**
- ✅ Test GET /api/sse/test endpoint
- ✅ Test POST /api/sse/test endpoint
- ✅ Test GET /api/sse endpoint
- ✅ View detailed response information
- ✅ Debug authentication issues

---

## 🎨 Event Type Colors

| Event Type | Color | Description |
|------------|-------|-------------|
| `system_message` | 🔵 Blue | System messages and connection events |
| `heartbeat` | 🟢 Green | Connection keep-alive events |
| `notification` | 🟡 Yellow | User notifications |
| `user_update` | 🟣 Purple | User data changes |
| `reel_upload` | 🟠 Orange | Video upload status |
| `search_result` | Indigo | Search results |
| `ping` | ⚪ Gray | Test connection events |
| `test_success` | 🟢 Emerald | Test operation success |
| `test_error` | Red | Test operation errors |

---

## 🔧 Backend Integration Examples

### **Sending Notifications from Backend**
```typescript
import { getSSEService } from "@/features/sse";

// In your webhook handler, job processor, etc.
const sse = getSSEService();

// Send notification to specific user
await sse.sendNotification(
  userId,
  "Upload Complete",
  "Your video has been processed successfully",
  "success",
  "/videos/123"
);

// Send user update
await sse.sendUserUpdate(userId, "status", "online");

// Send reel upload progress
await sse.sendReelUpdate(userId, "reel-123", "processing", 75);

// Send system message
await sse.sendSystemMessage(userId, "Maintenance scheduled", "MAINTENANCE_ALERT");
```

### **Channel-based Broadcasting**
```typescript
// Send to specific channel
await sse.sendToChannel("announcements", {
  type: "announcement",
  data: { message: "New feature released!" },
  timestamp: Date.now()
});

// Broadcast to all connected clients
await sse.broadcast({
  type: "system_alert",
  data: { message: "Server restart in 5 minutes" },
  timestamp: Date.now()
});
```

### **Custom Event Types**
```typescript
// Send custom events
await sse.sendCustomEvent(userId, "custom_event", {
  action: "user_action",
  data: { key: "value" },
  metadata: { source: "webhook" }
});
```

---

## 🐛 Troubleshooting

### **Connection Issues**
1. **Check authentication**: Make sure you're logged in (or using anonymous mode)
2. **Check server logs**: Look for SSE connection messages
3. **Check browser console**: Look for EventSource errors
4. **Verify endpoint**: Ensure `/api/sse` is accessible
5. **Use API test page**: Visit `/api-test` for detailed debugging

### **Events Not Received**
1. **Check user ID**: Events are sent to specific users
2. **Check connection status**: Ensure SSE connection is active
3. **Check event handlers**: Verify event listeners are set up
4. **Check server logs**: Look for event sending errors
5. **Check event history**: View events in the enhanced UI

### **Notification Button Errors**
1. **Check browser console**: Detailed error logs are now provided
2. **Check event history**: Error events appear in the UI
3. **Use API test page**: Test individual API endpoints
4. **Check response status**: HTTP status codes are logged
5. **Verify SSE connection**: Ensure you have an active SSE connection

### **Performance Issues**
1. **Monitor connection count**: Check server logs for active connections
2. **Check memory usage**: SSE connections consume memory
3. **Monitor Redis**: If using cross-instance communication
4. **Check event frequency**: Too many events can impact performance

---

## 📊 Monitoring

### **Server-side Monitoring**
```typescript
// Get active connection count
const sse = getSSEService();
const activeConnections = sse.getActiveConnections();
console.log(`Active SSE connections: ${activeConnections}`);

// Get SSE manager for advanced monitoring
const manager = sse.getManager();
console.log("SSE Manager status:", manager);
```

### **Client-side Monitoring**
```javascript
// Monitor connection status
client.onOpen(() => console.log("SSE connected"));
client.onClose(() => console.log("SSE disconnected"));
client.onError((error) => console.error("SSE error:", error));

// Monitor all events
client.on("*", (event) => {
  console.log(`Event [${event.type}] at ${new Date(event.timestamp).toISOString()}:`, event.data);
});
```

### **Enhanced UI Monitoring**
- **Real-time connection status** with visual indicators
- **Event counter** showing total events received
- **Client ID tracking** for debugging
- **Event type distribution** with color coding
- **Timestamp tracking** for performance monitoring

---

## 🧪 Automated Testing

### **Unit Tests**
```typescript
// Test SSE service methods
describe("SSE Service", () => {
  it("should send notification to user", async () => {
    const sse = new SSEService(new SSEManager());
    const result = await sse.sendNotification("user-123", "Test", "Message");
    expect(result).toBe(true);
  });
});
```

### **Integration Tests**
```typescript
// Test full SSE flow
describe("SSE Integration", () => {
  it("should receive events from server", async () => {
    const client = createSSEClient("/api/sse");
    const events: any[] = [];
    
    client.on("*", (event) => events.push(event));
    await client.connect();
    
    // Send test event
    await fetch("/api/sse/test", {
      method: "POST",
      body: JSON.stringify({ type: "notification", title: "Test" })
    });
    
    // Wait for event
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(events.length).toBeGreaterThan(0);
  });
});
```

### **API Testing**
```typescript
// Test API endpoints
describe("SSE API", () => {
  it("should respond to GET request", async () => {
    const response = await fetch("/api/sse/test");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("SSE Test API is working");
  });

  it("should send notification via POST", async () => {
    const response = await fetch("/api/sse/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "notification",
        title: "Test",
        message: "Test message"
      })
    });
    expect(response.status).toBe(200);
  });
});
```

---

## 📝 Event Types

| Event Type | Description | Data Structure | Color |
|------------|-------------|----------------|-------|
| `notification` | User notifications | `{ title, message, level, actionUrl? }` | 🟡 Yellow |
| `user_update` | User data changes | `{ userId, field, value }` | 🟣 Purple |
| `reel_upload` | Video upload status | `{ reelId, status, progress?, error? }` | 🟠 Orange |
| `search_result` | Search results | `{ query, results, total }` | Indigo |
| `system_message` | System messages | `{ message, code? }` | 🔵 Blue |
| `heartbeat` | Connection keep-alive | `{ timestamp }` | 🟢 Green |
| `ping` | Test connection | `{ timestamp }` | ⚪ Gray |
| `test_success` | Test operation success | `{ message, timestamp, result }` | 🟢 Emerald |
| `test_error` | Test operation errors | `{ message, timestamp, error }` | Red |

---

## 🔒 Security Considerations

1. **Authentication**: SSE connections require valid session (or anonymous mode for testing)
2. **User Isolation**: Events are only sent to authenticated users
3. **Rate Limiting**: Consider implementing rate limits for event sending
4. **Input Validation**: All event data is validated before sending
5. **CORS Configuration**: Proper CORS headers for cross-origin requests
6. **Error Handling**: Secure error messages that don't leak sensitive information

---

## 🚀 Production Deployment

1. **Enable Redis**: For cross-instance communication
2. **Configure CORS**: Adjust CORS settings for your domain
3. **Monitor Resources**: Track memory and connection usage
4. **Set up Logging**: Configure proper logging for SSE events
5. **Load Testing**: Test with multiple concurrent connections
6. **Error Monitoring**: Set up error tracking for SSE failures
7. **Performance Monitoring**: Track event delivery latency
8. **Security Auditing**: Regular security reviews of SSE implementation

---

## 📞 Support & Debugging

### **Enhanced Debugging Tools**
1. **Enhanced SSE Test UI**: `/sse-test` - Real-time event monitoring
2. **API Test Page**: `/api-test` - Individual API endpoint testing
3. **Browser Console**: Detailed error logging and event monitoring
4. **Server Logs**: Comprehensive SSE connection and event logging

### **Common Issues & Solutions**
1. **"Failed to send test notification"**: 
   - Check browser console for detailed error
   - Use API test page to isolate the issue
   - Verify SSE connection is active
   - Check server logs for authentication issues

2. **Events not appearing in UI**:
   - Check connection status (should show green dot)
   - Verify event handlers are registered
   - Check browser console for errors
   - Ensure you're using the correct user ID

3. **Connection drops**:
   - Check network stability
   - Verify server is running
   - Check for authentication timeouts
   - Monitor server logs for errors

### **Getting Help**
If you encounter issues:
1. Check the browser console for detailed error messages
2. Check server logs for SSE-related messages
3. Use the API test page to isolate API issues
4. Verify authentication is working
5. Test with the enhanced UI at `/sse-test`
6. Check the event history for error events

The SSE implementation is designed to be robust and handle edge cases gracefully. All requirements from the original ticket have been implemented and tested with comprehensive debugging tools. 