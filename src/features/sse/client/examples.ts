/**
 * Usage examples for SSE client utilities
 * Demonstrates different patterns and use cases for real-time events
 */

import { SSEClient, SSEConnectionState } from "./sse-client";
import {
  SSEEventHandlers,
  EventDebouncer,
  EventBatcher,
  EventFilter,
} from "./event-helpers";
import type {
  NotificationEvent,
  UserUpdateEvent,
  SystemEvent,
  ChatMessageEvent,
} from "./event-helpers";
import type { EventPayload } from "../types";

/**
 * Example 1: Basic SSE connection with notifications
 */
export function basicNotificationExample() {
  // Create SSE client with configuration
  const client = new SSEClient({
    endpoint: "/api/sse",
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    },
    timeout: 30000,
    debug: true,
  });

  // Set up typed event handlers
  const eventHandlers = new SSEEventHandlers(client);

  // Handle notifications
  eventHandlers.onNotification((notification: NotificationEvent) => {
    console.log("Received notification:", notification);

    // Show notification to user based on type
    switch (notification.type) {
      case "success":
        showSuccessToast(notification.title, notification.message);
        break;
      case "error":
        showErrorToast(notification.title, notification.message);
        break;
      case "warning":
        showWarningToast(notification.title, notification.message);
        break;
      default:
        showInfoToast(notification.title, notification.message);
    }
  });

  // Handle connection state changes
  client.onStateChange((state, previousState) => {
    console.log(`Connection state changed: ${previousState} -> ${state}`);

    switch (state) {
      case SSEConnectionState.CONNECTED:
        showSuccessToast("Connected", "Real-time updates are now active");
        break;
      case SSEConnectionState.RECONNECTING:
        showInfoToast("Reconnecting", "Attempting to restore connection...");
        break;
      case SSEConnectionState.ERROR:
        showErrorToast(
          "Connection Error",
          "Failed to connect to real-time updates",
        );
        break;
      case SSEConnectionState.CLOSED:
        showWarningToast("Disconnected", "Real-time updates are unavailable");
        break;
    }
  });

  // Handle errors
  client.onError((error) => {
    console.error("SSE Error:", error);
    showErrorToast("Connection Error", error.message);
  });

  // Connect to SSE endpoint
  client.connect();

  return client;
}

/**
 * Example 2: User-specific updates with filtering
 */
export function userUpdatesExample(currentUserId: string) {
  const client = new SSEClient({
    endpoint: "/api/sse",
    params: { userId: currentUserId },
    debug: false,
  });

  const eventHandlers = new SSEEventHandlers(client);

  // Handle user profile updates
  eventHandlers.onUserUpdate((update: UserUpdateEvent) => {
    console.log("User update received:", update);

    // Only process updates for current user
    if (update.userId === currentUserId) {
      updateUserProfile(update.field, update.newValue);
      showInfoToast("Profile Updated", `Your ${update.field} has been updated`);
    }
  });

  // Handle custom events with filtering
  client.on<EventPayload>("user-activity", (payload) => {
    // Filter events for current user
    const filter = EventFilter.forUser(currentUserId);
    if (filter(payload)) {
      updateUserActivityStatus(payload.data);
    }
  });

  client.connect();
  return client;
}

/**
 * Example 3: Chat application with message batching
 */
export function chatApplicationExample(chatRoomId: string) {
  const client = new SSEClient({
    endpoint: "/api/sse",
    params: { roomId: chatRoomId },
    reconnect: {
      enabled: true,
      maxAttempts: 10,
      initialDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
    },
  });

  const eventHandlers = new SSEEventHandlers(client);

  // Batch chat messages to avoid UI flooding
  const messageBatcher = new EventBatcher<ChatMessageEvent>((messages) => {
    console.log(`Processing batch of ${messages.length} messages`);
    messages.forEach((message) => {
      addMessageToChat(message);
    });
    scrollChatToBottom();
  }, 100);

  // Handle chat messages with batching
  eventHandlers.onChatMessage((message: ChatMessageEvent) => {
    messageBatcher.add(message);
  });

  // Handle typing indicators with debouncing
  const typingDebouncer = new EventDebouncer();
  client.on<EventPayload>("user-typing", (payload) => {
    const debouncedHandler = typingDebouncer.debounce(
      `typing-${payload.data.userId}`,
      (data: any) => {
        showTypingIndicator(data.userId, data.isTyping);
      },
      300,
    );
    debouncedHandler(payload.data);
  });

  // Handle user presence updates
  client.on<EventPayload>("user-presence", (payload) => {
    updateUserPresence(payload.data.userId, payload.data.status);
  });

  client.connect();
  return { client, messageBatcher, typingDebouncer };
}

/**
 * Example 4: System monitoring dashboard
 */
export function systemMonitoringExample() {
  const client = new SSEClient({
    endpoint: "/api/sse",
    params: { type: "admin" },
    timeout: 60000, // Longer timeout for admin connections
    debug: true,
  });

  const eventHandlers = new SSEEventHandlers(client);

  // Handle system events
  eventHandlers.onSystemEvent((event: SystemEvent) => {
    console.log("System event:", event);

    // Update dashboard based on event type
    switch (event.type) {
      case "maintenance":
        showMaintenanceNotice(event.message);
        break;
      case "alert":
        showSystemAlert(event.message, event.severity);
        break;
      case "update":
        showSystemUpdate(event.message);
        break;
    }

    // Log to system events panel
    addToSystemLog(event);
  });

  // Handle performance metrics
  client.on<EventPayload>("metrics", (payload) => {
    updatePerformanceMetrics(payload.data);
  });

  // Handle server health updates
  client.on<EventPayload>("health-check", (payload) => {
    updateServerHealthStatus(payload.data);
  });

  client.connect();
  return client;
}

/**
 * Example 5: E-commerce order tracking
 */
export function orderTrackingExample(orderId: string) {
  const client = new SSEClient({
    endpoint: "/api/sse",
    params: { orderId },
    reconnect: {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    },
  });

  // Handle order status updates
  client.on<EventPayload>("order-status", (payload) => {
    const { orderId: eventOrderId, status, timestamp, details } = payload.data;

    if (eventOrderId === orderId) {
      updateOrderStatus(status, timestamp, details);

      // Show appropriate notification
      switch (status) {
        case "confirmed":
          showSuccessToast("Order Confirmed", "Your order has been confirmed");
          break;
        case "shipped":
          showInfoToast("Order Shipped", "Your order is on its way");
          break;
        case "delivered":
          showSuccessToast("Order Delivered", "Your order has been delivered");
          break;
        case "cancelled":
          showWarningToast("Order Cancelled", "Your order has been cancelled");
          break;
      }
    }
  });

  // Handle delivery tracking updates
  client.on<EventPayload>("delivery-tracking", (payload) => {
    const { orderId: eventOrderId, location, estimatedDelivery } = payload.data;

    if (eventOrderId === orderId) {
      updateDeliveryTracking(location, estimatedDelivery);
    }
  });

  client.connect();
  return client;
}

/**
 * Example 6: Multi-client connection management
 */
export function multiClientExample() {
  const clients = new Map<string, SSEClient>();

  // Create different clients for different purposes
  const notificationClient = new SSEClient({
    endpoint: "/api/sse",
    params: { type: "notifications" },
  });

  const chatClient = new SSEClient({
    endpoint: "/api/sse",
    params: { type: "chat" },
  });

  const systemClient = new SSEClient({
    endpoint: "/api/sse",
    params: { type: "system" },
  });

  clients.set("notifications", notificationClient);
  clients.set("chat", chatClient);
  clients.set("system", systemClient);

  // Set up handlers for each client
  const notificationHandlers = new SSEEventHandlers(notificationClient);
  notificationHandlers.onNotification((notification) => {
    handleGlobalNotification(notification);
  });

  const chatHandlers = new SSEEventHandlers(chatClient);
  chatHandlers.onChatMessage((message) => {
    handleChatMessage(message);
  });

  const systemHandlers = new SSEEventHandlers(systemClient);
  systemHandlers.onSystemEvent((event) => {
    handleSystemEvent(event);
  });

  // Connect all clients
  clients.forEach((client) => client.connect());

  // Return cleanup function
  return () => {
    clients.forEach((client) => client.disconnect());
    clients.clear();
  };
}

/**
 * Example 7: Error handling and recovery
 */
export function errorHandlingExample() {
  const client = new SSEClient({
    endpoint: "/api/sse",
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    },
    debug: true,
  });

  // Comprehensive error handling
  client.onError((error, event) => {
    console.error("SSE Error occurred:", error);

    if ("code" in error) {
      // Handle SSE-specific errors
      const sseError = error as any;
      switch (sseError.code) {
        case "CONNECTION_ERROR":
          showErrorToast(
            "Connection Failed",
            "Unable to establish real-time connection",
          );
          break;
        case "AUTHENTICATION_ERROR":
          showErrorToast("Authentication Failed", "Please log in again");
          redirectToLogin();
          break;
        case "RATE_LIMIT_EXCEEDED":
          showWarningToast("Rate Limited", "Too many requests, please wait");
          break;
        default:
          showErrorToast("Unknown Error", sseError.message);
      }
    } else {
      // Handle generic errors
      showErrorToast("Connection Error", error.message);
    }
  });

  // Monitor connection state for recovery
  client.onStateChange((state, previousState) => {
    if (
      state === SSEConnectionState.CONNECTED &&
      previousState === SSEConnectionState.RECONNECTING
    ) {
      showSuccessToast("Reconnected", "Connection restored successfully");
      // Optionally refresh data that might have been missed
      refreshMissedData();
    }
  });

  client.connect();
  return client;
}

// Mock UI functions (replace with your actual UI library)
function showSuccessToast(title: string, message: string) {
  console.log(`✅ ${title}: ${message}`);
}

function showErrorToast(title: string, message: string) {
  console.log(`❌ ${title}: ${message}`);
}

function showWarningToast(title: string, message: string) {
  console.log(`⚠️ ${title}: ${message}`);
}

function showInfoToast(title: string, message: string) {
  console.log(`ℹ️ ${title}: ${message}`);
}

function updateUserProfile(field: string, value: any) {
  console.log(`Updating user profile: ${field} = ${value}`);
}

function updateUserActivityStatus(data: any) {
  console.log("Updating user activity:", data);
}

function addMessageToChat(message: ChatMessageEvent) {
  console.log("Adding message to chat:", message);
}

function scrollChatToBottom() {
  console.log("Scrolling chat to bottom");
}

function showTypingIndicator(userId: string, isTyping: boolean) {
  console.log(`User ${userId} is ${isTyping ? "typing" : "not typing"}`);
}

function updateUserPresence(userId: string, status: string) {
  console.log(`User ${userId} presence: ${status}`);
}

function showMaintenanceNotice(message: string) {
  console.log(`Maintenance notice: ${message}`);
}

function showSystemAlert(message: string, severity: string) {
  console.log(`System alert (${severity}): ${message}`);
}

function showSystemUpdate(message: string) {
  console.log(`System update: ${message}`);
}

function addToSystemLog(event: SystemEvent) {
  console.log("Adding to system log:", event);
}

function updatePerformanceMetrics(data: any) {
  console.log("Updating performance metrics:", data);
}

function updateServerHealthStatus(data: any) {
  console.log("Updating server health:", data);
}

function updateOrderStatus(status: string, timestamp: string, details: any) {
  console.log(`Order status: ${status} at ${timestamp}`, details);
}

function updateDeliveryTracking(location: string, estimatedDelivery: string) {
  console.log(`Delivery tracking: ${location}, ETA: ${estimatedDelivery}`);
}

function handleGlobalNotification(notification: NotificationEvent) {
  console.log("Global notification:", notification);
}

function handleChatMessage(message: ChatMessageEvent) {
  console.log("Chat message:", message);
}

function handleSystemEvent(event: SystemEvent) {
  console.log("System event:", event);
}

function redirectToLogin() {
  console.log("Redirecting to login...");
}

function refreshMissedData() {
  console.log("Refreshing missed data...");
}
