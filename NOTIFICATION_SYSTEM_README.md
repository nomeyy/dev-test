# Persistent Notification System

This project now includes a persistent notification system that stores notifications locally in the browser's localStorage, allowing users to see their notification history even after closing and reopening the browser tab.

## Features

### 🔄 Persistent Storage

- Notifications are stored in localStorage and persist across browser sessions
- Notifications remain available when users close and reopen tabs
- Automatic cleanup of old notifications (older than 7 days)

### 👤 User-Specific Notifications

- Notifications are tied to the logged-in user's session
- Welcome notification appears when users first load the component
- Real-time connection/disconnection notifications are stored locally

### 📱 Interactive Management

- Mark individual notifications as read/unread
- Mark all notifications as read at once
- Delete individual notifications
- Clear all notifications
- Refresh to reload from localStorage

### 🎨 Visual Indicators

- Unread count badge showing number of unread notifications
- Different visual styles for read vs unread notifications
- Color-coded icons for different notification types
- Relative timestamps (e.g., "5 min ago", "2h ago")

## How It Works

### 1. Local Storage

- Uses `localStorage` to persist notifications across browser sessions
- Key: `nomey_notifications`
- Automatically handles JSON serialization/deserialization

### 2. Real-Time Integration

- Integrates with existing Socket.IO and SSE systems
- Automatically stores connection/disconnection events
- Maintains real-time updates while preserving history

### 3. User Experience

- Welcome message explains the system to new users
- Notifications appear immediately and are stored for later viewing
- Clean, intuitive interface for managing notifications

## Technical Implementation

### Hook: `useLocalNotifications`

```typescript
const {
  notifications, // Array of notification objects
  unreadCount, // Number of unread notifications
  addNotification, // Add new notification
  markAsRead, // Mark single notification as read
  markAllAsRead, // Mark all notifications as read
  deleteNotification, // Delete single notification
  clearAll, // Clear all notifications
  refresh, // Reload from localStorage
} = useLocalNotifications(20); // Limit to 20 notifications
```

### Notification Object Structure

```typescript
interface LocalNotification {
  id: string; // Unique identifier
  type: string; // Notification type (e.g., "user:connected")
  message: string; // Display message
  timestamp: string; // ISO timestamp
  data?: any; // Additional data
  read: boolean; // Read status
}
```

## Usage Examples

### Adding a Notification

```typescript
addNotification({
  type: "user:connected",
  message: "John Doe connected",
  timestamp: new Date().toISOString(),
  data: { userId: "123", username: "John Doe" },
});
```

### Marking as Read

```typescript
markAsRead(notificationId);
```

### Clearing All

```typescript
clearAll();
```

## Benefits

1. **No Database Required**: Uses browser localStorage, no backend changes needed
2. **Immediate Persistence**: Notifications are saved instantly
3. **Cross-Session**: Works across browser restarts and tab closures
4. **User-Friendly**: Intuitive interface for managing notifications
5. **Performance**: No network requests for basic operations
6. **Privacy**: Data stays on user's device

## Browser Compatibility

- Modern browsers with localStorage support
- Automatic fallback for older browsers
- Graceful degradation if localStorage is unavailable

## Future Enhancements

- Sync notifications across multiple tabs
- Export/import notification history
- Custom notification categories
- Notification preferences and settings
- Integration with server-side notification system (when database is available)
