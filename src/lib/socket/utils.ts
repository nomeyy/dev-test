import { NotificationPayload } from "./server";

declare global {
  var io: any;
  var socketUsers: Map<string, any>;
}

/**
 * Utility functions for sending notifications from API routes and server-side code
 */

/**
 * Send notification to a specific user by user ID
 */
export function sendToUser(
  userId: string,
  notification: Omit<NotificationPayload, "timestamp">,
) {
  if (!global.io || !global.socketUsers) {
    console.warn("Socket.IO not initialized");
    return false;
  }

  const user = Array.from(global.socketUsers.values()).find(
    (u: any) => u.userId === userId,
  );
  if (user) {
    global.io.to(user.socketId).emit("event", {
      ...notification,
      timestamp: new Date(),
    });
    return true;
  }
  return false;
}

/**
 * Send notification to a specific socket by socket ID
 */
export function sendToSocket(
  socketId: string,
  notification: Omit<NotificationPayload, "timestamp">,
) {
  if (!global.io) {
    console.warn("Socket.IO not initialized");
    return;
  }

  global.io.to(socketId).emit("event", {
    ...notification,
    timestamp: new Date(),
  });
}

/**
 * Send notification to all users in a specific room
 */
export function sendToRoom(
  room: string,
  notification: Omit<NotificationPayload, "timestamp">,
) {
  if (!global.io) {
    console.warn("Socket.IO not initialized");
    return;
  }

  global.io.to(room).emit("event", {
    ...notification,
    timestamp: new Date(),
  });
}

/**
 * Broadcast notification to all connected clients
 */
export function broadcast(
  notification: Omit<NotificationPayload, "timestamp">,
) {
  if (!global.io) {
    console.warn("Socket.IO not initialized");
    return;
  }

  global.io.emit("event", {
    ...notification,
    timestamp: new Date(),
  });
}

/**
 * Send notification to multiple specific users
 */
export function sendToUsers(
  userIds: string[],
  notification: Omit<NotificationPayload, "timestamp">,
) {
  if (!global.io || !global.socketUsers) {
    console.warn("Socket.IO not initialized");
    return;
  }

  const socketIds = Array.from(global.socketUsers.values())
    .filter((u: any) => userIds.includes(u.userId))
    .map((u: any) => u.socketId);

  socketIds.forEach((socketId) => {
    sendToSocket(socketId, notification);
  });
}

/**
 * Get all connected users
 */
export function getConnectedUsers() {
  if (!global.socketUsers) {
    return [];
  }

  return Array.from(global.socketUsers.values());
}

/**
 * Get user by socket ID
 */
export function getUserBySocketId(socketId: string) {
  if (!global.socketUsers) {
    return null;
  }

  return global.socketUsers.get(socketId);
}

/**
 * Get user by user ID
 */
export function getUserByUserId(userId: string) {
  return Array.from(global.socketUsers?.values() || []).find(
    (u: any) => u.userId === userId,
  );
}

/**
 * Get connection statistics
 */
export function getSocketStats() {
  if (!global.socketUsers) {
    return {
      totalConnections: 0,
      users: [],
    };
  }

  return {
    totalConnections: global.socketUsers.size,
    users: getConnectedUsers().map((u: any) => ({
      id: u.id,
      userId: u.userId,
      connectedAt: u.connectedAt,
      lastActive: u.lastActive,
      rooms: Array.from(u.rooms),
    })),
  };
}

/**
 * Check if Socket.IO is initialized
 */
export function isSocketIOInitialized() {
  return !!(global.io && global.socketUsers);
}

// Predefined notification types for common use cases
export const NotificationTypes = {
  // User-related notifications
  USER_WELCOME: "user:welcome",
  USER_PROFILE_UPDATED: "user:profile_updated",
  USER_STATUS_CHANGED: "user:status_changed",

  // Message notifications
  MESSAGE_RECEIVED: "message:received",
  MESSAGE_SENT: "message:sent",
  MESSAGE_READ: "message:read",

  // System notifications
  SYSTEM_MAINTENANCE: "system:maintenance",
  SYSTEM_UPDATE: "system:update",
  SYSTEM_ERROR: "system:error",

  // Content notifications
  CONTENT_UPLOADED: "content:uploaded",
  CONTENT_PROCESSED: "content:processed",
  CONTENT_APPROVED: "content:approved",
  CONTENT_REJECTED: "content:rejected",

  // Real-time updates
  REALTIME_UPDATE: "realtime:update",
  REALTIME_PRESENCE: "realtime:presence",

  // Webhook notifications
  WEBHOOK_RECEIVED: "webhook:received",
  WEBHOOK_PROCESSED: "webhook:processed",
} as const;

// Helper functions for common notification patterns
export const notificationHelpers = {
  /**
   * Send a welcome notification to a new user
   */
  sendWelcomeNotification: (userId: string, userName: string) => {
    return sendToUser(userId, {
      type: NotificationTypes.USER_WELCOME,
      data: {
        message: `Welcome ${userName}!`,
        userName,
        timestamp: new Date(),
      },
    });
  },

  /**
   * Send a message notification
   */
  sendMessageNotification: (userId: string, messageData: any) => {
    return sendToUser(userId, {
      type: NotificationTypes.MESSAGE_RECEIVED,
      data: messageData,
    });
  },

  /**
   * Send a system maintenance notification
   */
  sendMaintenanceNotification: (message: string, scheduledTime?: Date) => {
    return broadcast({
      type: NotificationTypes.SYSTEM_MAINTENANCE,
      data: {
        message,
        scheduledTime,
        timestamp: new Date(),
      },
    });
  },

  /**
   * Send a content processing notification
   */
  sendContentProcessingNotification: (
    userId: string,
    contentId: string,
    status: string,
  ) => {
    return sendToUser(userId, {
      type: NotificationTypes.CONTENT_PROCESSED,
      data: {
        contentId,
        status,
        timestamp: new Date(),
      },
    });
  },

  /**
   * Send a real-time presence update
   */
  sendPresenceUpdate: (
    room: string,
    userId: string,
    status: "online" | "offline" | "away",
  ) => {
    return sendToRoom(room, {
      type: NotificationTypes.REALTIME_PRESENCE,
      data: {
        userId,
        status,
        timestamp: new Date(),
      },
    });
  },
};
