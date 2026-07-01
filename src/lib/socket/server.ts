import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/config/auth";

export interface SocketUser {
  id: string;
  socketId: string;
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastActive: Date;
  rooms: Set<string>;
}

export interface NotificationPayload {
  type: string;
  data: any;
  timestamp: Date;
  from?: string;
  to?: string | string[];
  room?: string;
}

class SocketManager {
  private io: SocketIOServer | null = null;
  private users = new Map<string, SocketUser>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    this.startHeartbeat();

    console.log("Socket.IO server initialized");
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on("connection", async (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Get session data if available
      let userId: string | undefined;
      let sessionId: string | undefined;

      try {
        // For Next.js API routes, we need to handle session differently
        // This is a simplified approach - you might need to adapt based on your auth setup
        if (socket.handshake.auth.token) {
          // Handle JWT token or session token
          sessionId = socket.handshake.auth.token;
        }
      } catch (error) {
        console.error("Error getting session:", error);
      }

      // Create user record
      const user: SocketUser = {
        id: socket.id,
        socketId: socket.id,
        userId,
        sessionId,
        connectedAt: new Date(),
        lastActive: new Date(),
        rooms: new Set(),
      };

      this.users.set(socket.id, user);

      // Send connection confirmation
      socket.emit("connected", {
        socketId: socket.id,
        timestamp: new Date(),
        totalConnections: this.users.size,
      });

      // Join default room
      socket.join("general");
      user.rooms.add("general");

      // Handle room joins
      socket.on("join-room", (room: string) => {
        socket.join(room);
        user.rooms.add(room);
        user.lastActive = new Date();

        socket.emit("room-joined", { room, timestamp: new Date() });
        console.log(`User ${socket.id} joined room: ${room}`);
      });

      // Handle room leaves
      socket.on("leave-room", (room: string) => {
        socket.leave(room);
        user.rooms.delete(room);
        user.lastActive = new Date();

        socket.emit("room-left", { room, timestamp: new Date() });
        console.log(`User ${socket.id} left room: ${room}`);
      });

      // Handle custom events
      socket.on("custom-event", (data: any) => {
        user.lastActive = new Date();
        console.log(`Custom event from ${socket.id}:`, data);

        // Echo back to sender
        socket.emit("custom-event-response", {
          ...data,
          timestamp: new Date(),
        });
      });

      // Handle ping/pong for connection health
      socket.on("ping", () => {
        user.lastActive = new Date();
        socket.emit("pong", { timestamp: new Date() });
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnect(socket.id);
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        this.handleDisconnect(socket.id);
      });
    });
  }

  private handleDisconnect(socketId: string) {
    const user = this.users.get(socketId);
    if (user) {
      // Clean up user data
      this.users.delete(socketId);

      // Notify other clients about disconnection
      this.io?.emit("user-disconnected", {
        socketId,
        userId: user.userId,
        timestamp: new Date(),
        totalConnections: this.users.size,
      });

      console.log(
        `User ${socketId} disconnected. Total connections: ${this.users.size}`,
      );
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.io?.emit("heartbeat", { timestamp: new Date() });

      // Clean up inactive connections
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [socketId, user] of this.users.entries()) {
        if (now.getTime() - user.lastActive.getTime() > inactiveThreshold) {
          console.log(`Removing inactive user: ${socketId}`);
          this.users.delete(socketId);
          this.io?.sockets.sockets.get(socketId)?.disconnect();
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Public API methods

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: NotificationPayload) {
    const user = Array.from(this.users.values()).find(
      (u) => u.userId === userId,
    );
    if (user) {
      this.io?.to(user.socketId).emit("notification", {
        ...notification,
        timestamp: notification.timestamp || new Date(),
      });
      return true;
    }
    return false;
  }

  /**
   * Send notification to a specific socket
   */
  sendToSocket(socketId: string, notification: NotificationPayload) {
    this.io?.to(socketId).emit("notification", {
      ...notification,
      timestamp: notification.timestamp || new Date(),
    });
  }

  /**
   * Send notification to all users in a room
   */
  sendToRoom(room: string, notification: NotificationPayload) {
    this.io?.to(room).emit("notification", {
      ...notification,
      timestamp: notification.timestamp || new Date(),
    });
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(notification: NotificationPayload) {
    this.io?.emit("notification", {
      ...notification,
      timestamp: notification.timestamp || new Date(),
    });
  }

  /**
   * Send notification to multiple specific users
   */
  sendToUsers(userIds: string[], notification: NotificationPayload) {
    const socketIds = Array.from(this.users.values())
      .filter((u) => userIds.includes(u.userId!))
      .map((u) => u.socketId);

    socketIds.forEach((socketId) => {
      this.sendToSocket(socketId, notification);
    });
  }

  /**
   * Get all connected users
   */
  getConnectedUsers() {
    return Array.from(this.users.values());
  }

  /**
   * Get user by socket ID
   */
  getUserBySocketId(socketId: string) {
    return this.users.get(socketId);
  }

  /**
   * Get user by user ID
   */
  getUserByUserId(userId: string) {
    return Array.from(this.users.values()).find((u) => u.userId === userId);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.users.size,
      users: this.getConnectedUsers().map((u) => ({
        id: u.id,
        userId: u.userId,
        connectedAt: u.connectedAt,
        lastActive: u.lastActive,
        rooms: Array.from(u.rooms),
      })),
    };
  }

  /**
   * Cleanup method
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.io?.close();
    this.users.clear();
  }
}

// Export singleton instance
export const socketManager = new SocketManager();

// Export utility functions for easy use in other parts of the app
export const socketUtils = {
  sendToUser: (userId: string, notification: NotificationPayload) =>
    socketManager.sendToUser(userId, notification),

  sendToSocket: (socketId: string, notification: NotificationPayload) =>
    socketManager.sendToSocket(socketId, notification),

  sendToRoom: (room: string, notification: NotificationPayload) =>
    socketManager.sendToRoom(room, notification),

  broadcast: (notification: NotificationPayload) =>
    socketManager.broadcast(notification),

  sendToUsers: (userIds: string[], notification: NotificationPayload) =>
    socketManager.sendToUsers(userIds, notification),

  getStats: () => socketManager.getStats(),

  getConnectedUsers: () => socketManager.getConnectedUsers(),
};
