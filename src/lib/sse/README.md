# Server-Sent Events (SSE) Backend Integration Guide

This guide shows you how to add real-time communication to your backend using Server-Sent Events. You'll learn how to send instant messages to specific users or broadcast to everyone.

## What You'll Learn

- How to send messages to individual users
- How to broadcast messages to all connected clients
- Best practices for real-time communication
- Error handling and monitoring
- Real-world examples you can use right away

## Quick Start

The SSE system lets you send real-time updates to your users. Think of it like a live chat system for your app - users get instant notifications without refreshing the page.

### Core Components

The main piece you'll work with is the SSEManager:

```typescript
import { sseManager } from "@/lib/sse/SSEManager";
```

## Sending Messages to Specific Users

Here's how to send notifications to individual users:

```typescript
import { sseManager } from "@/lib/sse/SSEManager";

function sendUserNotification(userId: string, message: string) {
  sseManager.sendToUser(userId, "notification", {
    type: "info",
    message,
    timestamp: new Date().toISOString(),
    userId,
  });
}

function sendOrderUpdate(userId: string, orderId: string, status: string) {
  sseManager.sendToUser(userId, "order-update", {
    orderId,
    status,
    timestamp: new Date().toISOString(),
    estimatedDelivery: status === "shipped" ? "2-3 business days" : null,
  });
}

function sendChatMessage(userId: string, senderId: string, message: string) {
  sseManager.sendToUser(userId, "chat-message", {
    senderId,
    message,
    timestamp: new Date().toISOString(),
    messageId: generateMessageId(),
  });
}
```

## Broadcasting to Everyone

Sometimes you want to send a message to all connected users:

```typescript
import { sseManager } from "@/lib/sse/SSEManager";

function broadcastMaintenance(planned: boolean, duration: string) {
  sseManager.broadcast("maintenance", {
    planned,
    duration,
    timestamp: new Date().toISOString(),
    startTime: planned
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
      : null,
  });
}

function broadcastSystemUpdate(
  update: string,
  severity: "info" | "warning" | "error",
) {
  sseManager.broadcast("system-update", {
    update,
    severity,
    timestamp: new Date().toISOString(),
    requiresAction: severity === "error",
  });
}

function broadcastAnnouncement(
  title: string,
  content: string,
  priority: "low" | "medium" | "high",
) {
  sseManager.broadcast("announcement", {
    title,
    content,
    priority,
    timestamp: new Date().toISOString(),
    id: generateAnnouncementId(),
  });
}
```

## Advanced Patterns

### Sending Multiple Messages at Once

```typescript
function sendBatchNotifications(
  notifications: Array<{
    userId: string;
    message: string;
    type: "info" | "warning" | "error";
  }>,
) {
  notifications.forEach(({ userId, message, type }) => {
    sseManager.sendToUser(userId, "notification", {
      type,
      message,
      timestamp: new Date().toISOString(),
      batchId: generateBatchId(),
    });
  });
}

function broadcastToUserGroup(
  groupId: string,
  event: string,
  data: Record<string, unknown>,
) {
  const groupUsers = getUserGroupMembers(groupId);
  groupUsers.forEach((userId) => {
    sseManager.sendToUser(userId, event, {
      ...data,
      timestamp: new Date().toISOString(),
      groupId,
    });
  });
}
```

### Sending to Specific User Types

```typescript
function broadcastToAdmins(event: string, data: Record<string, unknown>) {
  const adminUsers = getAdminUsers();
  adminUsers.forEach((userId) => {
    sseManager.sendToUser(userId, event, {
      ...data,
      timestamp: new Date().toISOString(),
      adminOnly: true,
    });
  });
}

function broadcastToActiveUsers(event: string, data: Record<string, unknown>) {
  const activeUsers = getActiveUsers();
  activeUsers.forEach((userId) => {
    sseManager.sendToUser(userId, event, {
      ...data,
      timestamp: new Date().toISOString(),
      activeUser: true,
    });
  });
}
```

### Sending Related Events in Sequence

```typescript
async function sendOrderProcessingSequence(userId: string, orderId: string) {
  const steps = [
    { status: "processing", message: "Order is being processed" },
    { status: "confirmed", message: "Order confirmed" },
    { status: "shipped", message: "Order has been shipped" },
    { status: "delivered", message: "Order delivered successfully" },
  ];

  for (const step of steps) {
    sseManager.sendToUser(userId, "order-status", {
      orderId,
      status: step.status,
      message: step.message,
      timestamp: new Date().toISOString(),
      step: steps.indexOf(step) + 1,
      totalSteps: steps.length,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
```

## Handling Errors Gracefully

Things don't always go perfectly. Here's how to handle errors:

```typescript
import { sseManager } from "@/lib/sse/SSEManager";

function sendNotificationWithErrorHandling(userId: string, message: string) {
  try {
    sseManager.sendToUser(userId, "notification", {
      type: "info",
      message,
      timestamp: new Date().toISOString(),
    });

    console.log(`Notification sent to user ${userId}`);
  } catch (error) {
    console.error(`Failed to send notification to user ${userId}:`, error);
    storeNotificationForLater(userId, message);
  }
}

function broadcastWithErrorHandling(
  event: string,
  data: Record<string, unknown>,
) {
  try {
    sseManager.broadcast(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`Broadcast sent: ${event}`);
  } catch (error) {
    console.error(`Failed to broadcast ${event}:`, error);

    setTimeout(() => {
      try {
        sseManager.broadcast(event, data);
      } catch (retryError) {
        console.error(`Retry failed for ${event}:`, retryError);
      }
    }, 5000);
  }
}
```

## Monitoring Your Connections

Keep an eye on your SSE connections:

```typescript
function getConnectionStatus() {
  const clientCount = sseManager.getClientCount();
  const isHealthy = clientCount > 0;

  return {
    connectedClients: clientCount,
    isHealthy,
    timestamp: new Date().toISOString(),
  };
}

function performHealthCheck() {
  const status = getConnectionStatus();

  if (!status.isHealthy) {
    console.warn("Health check failed: No connected clients");
  }

  return status;
}
```

## Best Practices

### Use Consistent Event Names

```typescript
const SSE_EVENTS = {
  USER_NOTIFICATION: "user-notification",
  ORDER_UPDATE: "order-update",
  CHAT_MESSAGE: "chat-message",
  SYSTEM_MAINTENANCE: "system-maintenance",
  SYSTEM_UPDATE: "system-update",
  ANNOUNCEMENT: "announcement",
  LIVE_UPDATE: "live-update",
  STATUS_CHANGE: "status-change",
  PROGRESS_UPDATE: "progress-update",
} as const;

function sendTypedNotification(userId: string, message: string) {
  sseManager.sendToUser(userId, SSE_EVENTS.USER_NOTIFICATION, {
    message,
    timestamp: new Date().toISOString(),
  });
}
```

### Keep Your Data Structure Consistent

```typescript
interface BaseSSEData {
  timestamp: string;
  id?: string;
  userId?: string;
}

interface NotificationData extends BaseSSEData {
  type: "info" | "warning" | "error" | "success";
  message: string;
  title?: string;
  actionUrl?: string;
}

interface OrderUpdateData extends BaseSSEData {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

function sendTypedNotification(
  userId: string,
  data: Omit<NotificationData, "timestamp">,
) {
  sseManager.sendToUser(userId, "notification", {
    ...data,
    timestamp: new Date().toISOString(),
  });
}
```

### Control Message Frequency

```typescript
import { rateLimit } from "@/lib/rate-limit";

const sseRateLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

async function sendRateLimitedNotification(userId: string, message: string) {
  try {
    await sseRateLimiter.check(5, userId);

    sseManager.sendToUser(userId, "notification", {
      type: "info",
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(`Rate limit exceeded for user ${userId}`);
  }
}
```

### Prioritize Your Messages

```typescript
enum MessagePriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

function sendPrioritizedMessage(
  userId: string,
  event: string,
  data: Record<string, unknown>,
  priority: MessagePriority = MessagePriority.NORMAL,
) {
  const messageData = {
    ...data,
    priority,
    timestamp: new Date().toISOString(),
  };

  if (priority === MessagePriority.URGENT) {
    sseManager.sendToUser(userId, event, messageData);
  } else {
    queueMessage(userId, event, messageData, priority);
  }
}
```

## Real-World Examples

### E-commerce Order Updates

```typescript
class OrderSSEService {
  static sendOrderConfirmation(userId: string, orderId: string) {
    sseManager.sendToUser(userId, "order-confirmation", {
      orderId,
      status: "confirmed",
      timestamp: new Date().toISOString(),
      estimatedDelivery: "3-5 business days",
    });
  }

  static sendShippingUpdate(
    userId: string,
    orderId: string,
    trackingNumber: string,
  ) {
    sseManager.sendToUser(userId, "shipping-update", {
      orderId,
      trackingNumber,
      status: "shipped",
      timestamp: new Date().toISOString(),
    });
  }

  static sendDeliveryNotification(userId: string, orderId: string) {
    sseManager.sendToUser(userId, "delivery-notification", {
      orderId,
      status: "delivered",
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Real-time Chat

```typescript
class ChatSSEService {
  static sendMessage(senderId: string, receiverId: string, message: string) {
    sseManager.sendToUser(receiverId, "chat-message", {
      senderId,
      message,
      timestamp: new Date().toISOString(),
      messageId: generateMessageId(),
    });
  }

  static sendTypingIndicator(
    receiverId: string,
    senderId: string,
    isTyping: boolean,
  ) {
    sseManager.sendToUser(receiverId, "typing-indicator", {
      senderId,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  static sendReadReceipt(receiverId: string, messageId: string) {
    sseManager.sendToUser(receiverId, "read-receipt", {
      messageId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### System Monitoring

```typescript
class SystemSSEService {
  static broadcastSystemHealth(status: "healthy" | "degraded" | "down") {
    sseManager.broadcast("system-health", {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
  }

  static sendMaintenanceAlert(
    planned: boolean,
    duration: string,
    reason: string,
  ) {
    sseManager.broadcast("maintenance-alert", {
      planned,
      duration,
      reason,
      timestamp: new Date().toISOString(),
      startTime: planned
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
        : null,
    });
  }
}
```

## Testing Your SSE Functions

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sseManager } from "@/lib/sse/SSEManager";
import { sendUserNotification } from "./sse-service";

vi.mock("@/lib/sse/SSEManager", () => ({
  sseManager: {
    sendToUser: vi.fn(),
    broadcast: vi.fn(),
    getClientCount: vi.fn(() => 5),
  },
}));

describe("SSE Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send user notification", () => {
    const userId = "user123";
    const message = "Test notification";

    sendUserNotification(userId, message);

    expect(sseManager.sendToUser).toHaveBeenCalledWith(
      userId,
      "notification",
      expect.objectContaining({
        type: "info",
        message,
        timestamp: expect.any(String),
      }),
    );
  });
});
```

## API Reference

Here are the main methods you'll use:

```typescript
// Send message to specific user
sseManager.sendToUser(userId: string, event: string, data: Record<string, unknown>): void

// Broadcast message to all connected clients
sseManager.broadcast(event: string, data: Record<string, unknown>): void

// Get number of connected clients
sseManager.getClientCount(): number

// Check if user is connected
sseManager.isUserConnected(userId: string): boolean

// Remove specific user connection
sseManager.removeClient(userId: string): void
```

That's it! You now have everything you need to add real-time communication to your app. Start with the simple examples and gradually add more advanced features as you need them.
