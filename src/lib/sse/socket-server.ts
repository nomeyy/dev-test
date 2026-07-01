import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { SSEManager } from "./sse-service";
import { setSSEManager } from "./sse-utils";
import { logger } from "@/utils/logging";

export interface SocketServerConfig {
  cors?: {
    origin: string | string[];
    methods: string[];
    credentials?: boolean;
  };
  heartbeatInterval?: number;
  cleanupInterval?: number;
  maxConnections?: number;
  namespace?: string;
}

export class SocketServer {
  private io: SocketIOServer;
  private sseManager: SSEManager;
  private config: SocketServerConfig;

  constructor(httpServer: HTTPServer, config: SocketServerConfig = {}) {
    this.config = {
      cors: {
        origin: config.cors?.origin || "*",
        methods: config.cors?.methods || ["GET", "POST"],
        credentials: config.cors?.credentials || true,
      },
      heartbeatInterval: config.heartbeatInterval || 30000,
      cleanupInterval: config.cleanupInterval || 60000,
      maxConnections: config.maxConnections || 1000,
      namespace: config.namespace || "/",
    };

    // Create Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors,
      transports: ["websocket", "polling"],
      allowEIO3: true,
      path: "/api/socket.io",
      serveClient: false,
    });

    // Create SSE manager
    this.sseManager = new SSEManager(httpServer, {
      cors: this.config.cors,
      heartbeatInterval: this.config.heartbeatInterval,
      cleanupInterval: this.config.cleanupInterval,
      maxConnections: this.config.maxConnections,
    });

    // Set global instance for utility functions
    setSSEManager(this.sseManager);

    this.setupEventHandlers();
    this.setupMiddleware();

    logger.info("Socket Server initialized", {
      namespace: this.config.namespace,
      heartbeatInterval: this.config.heartbeatInterval,
      cleanupInterval: this.config.cleanupInterval,
      maxConnections: this.config.maxConnections,
    });
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;
      const userId = socket.handshake.auth.userId;
      const sessionId = socket.handshake.auth.sessionId;

      // Basic validation - in production, you'd want proper JWT validation
      if (!userId && !token) {
        logger.warn("Socket connection attempt without authentication", {
          socketId: socket.id,
          headers: socket.handshake.headers,
        });
        return next(new Error("Authentication required"));
      }

      // Store auth info in socket for later use
      socket.data.userId = userId;
      socket.data.sessionId = sessionId;
      socket.data.authenticated = true;

      next();
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      // Simple rate limiting - in production, use Redis-based rate limiting
      const now = Date.now();
      const lastEvent = socket.data.lastEvent || 0;
      const minInterval = 100; // Minimum 100ms between events

      if (now - lastEvent < minInterval) {
        return next(new Error("Rate limit exceeded"));
      }

      socket.data.lastEvent = now;
      next();
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: any) {
    const clientId = socket.id;
    const userId = socket.data.userId;
    const sessionId = socket.data.sessionId;

    logger.info("Socket client connected", {
      clientId,
      userId,
      sessionId,
      totalConnections: this.io.engine.clientsCount,
    });

    // Send connection confirmation
    socket.emit("connected", {
      type: "connected",
      clientId,
      userId,
      timestamp: new Date().toISOString(),
      totalConnections: this.io.engine.clientsCount,
    });

    // Handle client events
    socket.on("ping", () => {
      socket.emit("pong", {
        timestamp: new Date().toISOString(),
        clientId,
      });
    });

    socket.on("subscribe", (data: { channels?: string[] }) => {
      this.handleSubscription(socket, data);
    });

    socket.on("join-room", (roomName: string) => {
      socket.join(roomName);
      socket.emit("room-joined", {
        room: roomName,
        timestamp: new Date().toISOString(),
      });
      logger.debug("Client joined room", { clientId, room: roomName });
    });

    socket.on("leave-room", (roomName: string) => {
      socket.leave(roomName);
      socket.emit("room-left", {
        room: roomName,
        timestamp: new Date().toISOString(),
      });
      logger.debug("Client left room", { clientId, room: roomName });
    });

    socket.on(
      "send-message",
      (data: { room: string; message: string; metadata?: any }) => {
        this.handleMessage(socket, data);
      },
    );

    socket.on("disconnect", (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    socket.on("error", (error: Error) => {
      logger.error("Socket error", { clientId, error: error.message });
      this.handleDisconnection(socket, "error");
    });
  }

  private handleSubscription(socket: any, data: { channels?: string[] }) {
    const clientId = socket.id;
    const channels = data.channels || ["default"];

    // Join socket rooms for targeted messaging
    channels.forEach((channel) => {
      socket.join(channel);
    });

    logger.info("Client subscribed to channels", {
      clientId,
      channels,
      userId: socket.data.userId,
    });

    socket.emit("subscribed", {
      type: "subscribed",
      channels,
      timestamp: new Date().toISOString(),
    });
  }

  private handleMessage(
    socket: any,
    data: { room: string; message: string; metadata?: any },
  ) {
    const clientId = socket.id;
    const userId = socket.data.userId;
    const { room, message, metadata } = data;

    // Broadcast message to room
    this.io.to(room).emit("message", {
      type: "message",
      room,
      message,
      from: {
        clientId,
        userId,
      },
      timestamp: new Date().toISOString(),
      metadata,
    });

    logger.debug("Message sent to room", {
      clientId,
      userId,
      room,
      messageLength: message.length,
    });
  }

  private handleDisconnection(socket: any, reason: string) {
    const clientId = socket.id;
    const userId = socket.data.userId;

    logger.info("Socket client disconnected", {
      clientId,
      userId,
      reason,
      totalConnections: this.io.engine.clientsCount,
    });
  }

  // Public API methods

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get the SSE manager instance
   */
  public getSSEManager(): SSEManager {
    return this.sseManager;
  }

  /**
   * Send an event to a specific client
   */
  public sendToClient(clientId: string, event: string, data: any): boolean {
    try {
      this.io.to(clientId).emit(event, data);
      return true;
    } catch (error) {
      logger.error("Failed to send to client", { clientId, event, error });
      return false;
    }
  }

  /**
   * Send an event to a specific room
   */
  public sendToRoom(roomName: string, event: string, data: any): number {
    try {
      const room = this.io.sockets.adapter.rooms.get(roomName);
      const clientCount = room ? room.size : 0;

      this.io.to(roomName).emit(event, data);
      return clientCount;
    } catch (error) {
      logger.error("Failed to send to room", { roomName, event, error });
      return 0;
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  public broadcast(event: string, data: any): number {
    try {
      this.io.emit(event, data);
      return this.io.engine.clientsCount;
    } catch (error) {
      logger.error("Failed to broadcast", { event, error });
      return 0;
    }
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      totalConnections: this.io.engine.clientsCount,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
      sseStats: this.sseManager.getConnections(),
    };
  }

  /**
   * Shutdown the server
   */
  public shutdown() {
    this.sseManager.shutdown();
    this.io.close();
    logger.info("Socket Server shutdown complete");
  }
}
