import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { logger } from "@/utils/logging";

export interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ClientInfo {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastActive: Date;
  metadata?: Record<string, any>;
}

export interface SSEManagerConfig {
  cors?: {
    origin: string | string[];
    methods: string[];
  };
  heartbeatInterval?: number;
  cleanupInterval?: number;
  maxConnections?: number;
}

export class SSEManager {
  private io: SocketIOServer;
  private clients: Map<string, ClientInfo> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;
  private config: SSEManagerConfig;

  constructor(httpServer: HTTPServer, config: SSEManagerConfig = {}) {
    this.config = {
      cors: {
        origin: config.cors?.origin || "*",
        methods: config.cors?.methods || ["GET", "POST"],
      },
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      cleanupInterval: config.cleanupInterval || 60000, // 1 minute
      maxConnections: config.maxConnections || 1000,
    };

    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors,
      transports: ["websocket", "polling"],
      allowEIO3: true,
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startCleanup();

    logger.info("SSE Manager initialized", {
      heartbeatInterval: this.config.heartbeatInterval,
      cleanupInterval: this.config.cleanupInterval,
      maxConnections: this.config.maxConnections,
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    const clientId = socket.id;
    const clientInfo: ClientInfo = {
      id: clientId,
      userId: socket.handshake.auth.userId,
      sessionId: socket.handshake.auth.sessionId,
      connectedAt: new Date(),
      lastActive: new Date(),
      metadata: socket.handshake.auth.metadata,
    };

    this.clients.set(clientId, clientInfo);

    // Send connection confirmation
    socket.emit("connected", {
      type: "connected",
      clientId,
      timestamp: new Date().toISOString(),
      totalConnections: this.clients.size,
    });

    // Notify other clients about new connection
    this.broadcastToOthers(clientId, "connection-update", {
      type: "new-connection",
      clientId,
      totalConnections: this.clients.size,
    });

    logger.info("Client connected", {
      clientId,
      userId: clientInfo.userId,
      totalConnections: this.clients.size,
    });

    // Handle client events
    socket.on("ping", () => {
      this.updateClientActivity(clientId);
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });

    socket.on("subscribe", (data: { channels?: string[] }) => {
      this.handleSubscription(socket, data);
    });

    socket.on("disconnect", (reason: string) => {
      this.handleDisconnection(clientId, reason);
    });

    socket.on("error", (error: Error) => {
      logger.error("Socket error", { clientId, error: error.message });
      this.handleDisconnection(clientId, "error");
    });
  }

  private handleSubscription(socket: Socket, data: { channels?: string[] }) {
    const clientId = socket.id;
    const channels = data.channels || ["default"];

    // Join socket rooms for targeted messaging
    channels.forEach((channel) => {
      socket.join(channel);
    });

    logger.info("Client subscribed to channels", {
      clientId,
      channels,
      userId: this.clients.get(clientId)?.userId,
    });

    socket.emit("subscribed", {
      type: "subscribed",
      channels,
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnection(clientId: string, reason: string) {
    const clientInfo = this.clients.get(clientId);
    if (clientInfo) {
      this.clients.delete(clientId);

      // Notify remaining clients about disconnection
      this.broadcastToOthers(clientId, "connection-update", {
        type: "disconnection",
        clientId,
        userId: clientInfo.userId,
        totalConnections: this.clients.size,
      });

      logger.info("Client disconnected", {
        clientId,
        userId: clientInfo.userId,
        reason,
        totalConnections: this.clients.size,
      });
    }
  }

  private updateClientActivity(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActive = new Date();
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.io.emit("heartbeat", {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        totalConnections: this.clients.size,
      });
    }, this.config.heartbeatInterval!);
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, this.config.cleanupInterval!);
  }

  private cleanupInactiveConnections() {
    const now = new Date();
    const inactiveThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes

    const inactiveClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (client.lastActive < inactiveThreshold) {
        inactiveClients.push(clientId);
      }
    });

    if (inactiveClients.length > 0) {
      inactiveClients.forEach((clientId) => {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.disconnect(true);
        }
        this.clients.delete(clientId);
      });

      logger.info("Cleaned up inactive connections", {
        count: inactiveClients.length,
        totalConnections: this.clients.size,
      });
    }
  }

  // Public API methods

  /**
   * Send an event to a specific client
   */
  public sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn("Attempted to send to non-existent client", { clientId });
      return false;
    }

    try {
      this.io.to(clientId).emit("event", event);
      this.updateClientActivity(clientId);
      logger.debug("Event sent to client", { clientId, eventType: event.type });
      return true;
    } catch (error) {
      logger.error("Failed to send event to client", { clientId, error });
      return false;
    }
  }

  /**
   * Send an event to a specific user (across all their connections)
   */
  public sendToUser(userId: string, event: SSEEvent): number {
    const userClients = Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );

    if (userClients.length === 0) {
      logger.warn("Attempted to send to non-existent user", { userId });
      return 0;
    }

    try {
      this.io.to(userClients.map((c) => c.id)).emit("event", event);
      userClients.forEach((client) => this.updateClientActivity(client.id));
      logger.debug("Event sent to user", {
        userId,
        eventType: event.type,
        clientCount: userClients.length,
      });
      return userClients.length;
    } catch (error) {
      logger.error("Failed to send event to user", { userId, error });
      return 0;
    }
  }

  /**
   * Send an event to clients in a specific channel
   */
  public sendToChannel(channel: string, event: SSEEvent): number {
    try {
      const room = this.io.sockets.adapter.rooms.get(channel);
      const clientCount = room ? room.size : 0;

      this.io.to(channel).emit("event", event);

      // Update activity for clients in the channel
      if (room) {
        room.forEach((clientId) => {
          this.updateClientActivity(clientId);
        });
      }

      logger.debug("Event sent to channel", {
        channel,
        eventType: event.type,
        clientCount,
      });
      return clientCount;
    } catch (error) {
      logger.error("Failed to send event to channel", { channel, error });
      return 0;
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  public broadcast(event: SSEEvent): number {
    try {
      this.io.emit("event", event);

      // Update activity for all clients
      this.clients.forEach((client) => {
        this.updateClientActivity(client.id);
      });

      logger.debug("Event broadcasted", {
        eventType: event.type,
        clientCount: this.clients.size,
      });
      return this.clients.size;
    } catch (error) {
      logger.error("Failed to broadcast event", { error });
      return 0;
    }
  }

  /**
   * Broadcast to all clients except the specified one
   */
  public broadcastToOthers(
    excludeClientId: string,
    eventType: string,
    data: any,
  ): number {
    try {
      const event: SSEEvent = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      };

      this.io.except(excludeClientId).emit("event", event);

      // Update activity for other clients
      this.clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId) {
          this.updateClientActivity(clientId);
        }
      });

      return this.clients.size - 1;
    } catch (error) {
      logger.error("Failed to broadcast to others", { excludeClientId, error });
      return 0;
    }
  }

  /**
   * Get information about all connected clients
   */
  public getConnections(): { total: number; clients: ClientInfo[] } {
    return {
      total: this.clients.size,
      clients: Array.from(this.clients.values()),
    };
  }

  /**
   * Get information about a specific client
   */
  public getClient(clientId: string): ClientInfo | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Check if a client is connected
   */
  public isClientConnected(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * Get all clients for a specific user
   */
  public getUserClients(userId: string): ClientInfo[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  /**
   * Disconnect a specific client
   */
  public disconnectClient(
    clientId: string,
    reason: string = "server-initiated",
  ): boolean {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.disconnect(true);
      this.clients.delete(clientId);
      logger.info("Client disconnected by server", { clientId, reason });
      return true;
    }
    return false;
  }

  /**
   * Disconnect all clients for a specific user
   */
  public disconnectUser(
    userId: string,
    reason: string = "server-initiated",
  ): number {
    const userClients = this.getUserClients(userId);

    userClients.forEach((client) => {
      this.disconnectClient(client.id, reason);
    });

    logger.info("All user clients disconnected", {
      userId,
      count: userClients.length,
      reason,
    });
    return userClients.length;
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.io.close();
    this.clients.clear();

    logger.info("SSE Manager shutdown complete");
  }
}
