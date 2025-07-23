import { env } from "@/env";
import type { 
  SSEManagerType, 
  SSEClient, 
  SSEEvent, 
  SSEConfig,
  SSERedisMessage 
} from "../types";
import { getRedis } from "@/lib/redis";
import { RedisService } from "@/features/redis";

/**
 * Default SSE configuration
 */
const DEFAULT_CONFIG: SSEConfig = {
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  connectionTimeout: 300000, // 5 minutes
  enableRedis: env.NODE_ENV === "production",
  redisChannel: "sse_events",
};

/**
 * SSE Manager implementation
 * Handles client connections, event dispatching, and connection lifecycle
 */
export class SSEManager implements SSEManagerType {
  private clients: Map<string, SSEClient> = new Map();
  private userClients: Map<string, Set<string>> = new Map();
  private channelClients: Map<string, Set<string>> = new Map();
  private config: SSEConfig;
  private redisService: RedisService | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private instanceId: string;

  constructor(config: Partial<SSEConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.instanceId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.initializeRedis();
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Initialize Redis connection for cross-instance communication
   */
  private async initializeRedis(): Promise<void> {
    if (!this.config.enableRedis) return;

    try {
      const redisClient = await getRedis();
      this.redisService = new RedisService(redisClient);
      
      // Set up Redis subscription for cross-instance events
      this.setupRedisSubscription();
    } catch (error) {
      console.error("Failed to initialize Redis for SSE:", error);
    }
  }

  /**
   * Set up Redis subscription for cross-instance event broadcasting
   */
  private async setupRedisSubscription(): Promise<void> {
    if (!this.redisService) return;

    // Note: Upstash Redis doesn't support subscriptions in the same way
    // We'll use polling for cross-instance communication
    setInterval(async () => {
      try {
        // Check for pending cross-instance messages
        const pendingKey = `sse:pending:${this.instanceId}`;
        const pending = await this.redisService!.getValue(pendingKey);
        
        if (pending) {
          const message: SSERedisMessage = JSON.parse(pending);
          await this.handleRedisMessage(message);
          await this.redisService!.deleteKey(pendingKey);
        }
      } catch (error) {
        console.error("Error checking Redis messages:", error);
      }
    }, 1000); // Check every second
  }

  /**
   * Handle incoming Redis messages from other instances
   */
  private async handleRedisMessage(message: SSERedisMessage): Promise<void> {
    if (message.instanceId === this.instanceId) return; // Skip own messages

    switch (message.target) {
      case "user":
        if (message.targetId) {
          this.sendToUser(message.targetId, message.event);
        }
        break;
      case "channel":
        if (message.targetId) {
          this.sendToChannel(message.targetId, message.event);
        }
        break;
      case "broadcast":
        this.broadcast(message.event);
        break;
    }
  }

  /**
   * Add a new client connection
   */
  addClient(client: SSEClient): void {
    if (this.clients.size >= this.config.maxConnections) {
      throw new Error("Maximum connections reached");
    }

    this.clients.set(client.id, client);

    // Track by user
    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client.id);
    }

    // Track by channels
    client.channels.forEach(channel => {
      if (!this.channelClients.has(channel)) {
        this.channelClients.set(channel, new Set());
      }
      this.channelClients.get(channel)!.add(client.id);
    });

    console.log(`SSE client connected: ${client.id} (user: ${client.userId || 'anonymous'})`);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from user tracking
    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    // Remove from channel tracking
    client.channels.forEach(channel => {
      const channelClients = this.channelClients.get(channel);
      if (channelClients) {
        channelClients.delete(clientId);
        if (channelClients.size === 0) {
          this.channelClients.delete(channel);
        }
      }
    });

    this.clients.delete(clientId);
    console.log(`SSE client disconnected: ${clientId}`);
  }

  /**
   * Get a specific client by ID
   */
  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients for a specific user
   */
  getClientsByUser(userId: string): SSEClient[] {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map(id => this.clients.get(id))
      .filter((client): client is SSEClient => client !== undefined);
  }

  /**
   * Get all clients subscribed to a specific channel
   */
  getClientsByChannel(channel: string): SSEClient[] {
    const clientIds = this.channelClients.get(channel);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map(id => this.clients.get(id))
      .filter((client): client is SSEClient => client !== undefined);
  }

  /**
   * Send an event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      const eventData = this.formatSSEEvent(event);
      client.controller.enqueue(new TextEncoder().encode(eventData));
      client.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error(`Failed to send event to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send an event to all clients of a specific user
   */
  sendToUser(userId: string, event: SSEEvent): boolean {
    const clients = this.getClientsByUser(userId);
    if (clients.length === 0) return false;

    let sentCount = 0;
    clients.forEach(client => {
      if (this.sendToClient(client.id, event)) {
        sentCount++;
      }
    });

    return sentCount > 0;
  }

  /**
   * Send an event to all clients subscribed to a specific channel
   */
  sendToChannel(channel: string, event: SSEEvent): boolean {
    const clients = this.getClientsByChannel(channel);
    if (clients.length === 0) return false;

    let sentCount = 0;
    clients.forEach(client => {
      if (this.sendToClient(client.id, event)) {
        sentCount++;
      }
    });

    return sentCount > 0;
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: SSEEvent): void {
    const clients = Array.from(this.clients.values());
    clients.forEach(client => {
      this.sendToClient(client.id, event);
    });
  }

  /**
   * Get the number of active connections
   */
  getActiveConnections(): number {
    return this.clients.size;
  }

  /**
   * Format an SSE event according to the SSE specification
   */
  private formatSSEEvent(event: SSEEvent): string {
    const lines = [
      `event: ${event.type}`,
      `data: ${JSON.stringify(event.data)}`,
      `id: ${event.id || Date.now().toString()}`,
      `timestamp: ${event.timestamp}`,
      "", // Empty line to separate events
    ];
    return lines.join("\n");
  }

  /**
   * Start heartbeat mechanism to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent: SSEEvent = {
        type: "heartbeat",
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      };

      this.broadcast(heartbeatEvent);
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup mechanism to remove stale connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleClients: string[] = [];

      this.clients.forEach((client, clientId) => {
        if (now - client.lastActivity > this.config.connectionTimeout) {
          staleClients.push(clientId);
        }
      });

      staleClients.forEach(clientId => {
        this.removeClient(clientId);
      });

      if (staleClients.length > 0) {
        console.log(`Cleaned up ${staleClients.length} stale SSE connections`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all client connections
    this.clients.forEach(client => {
      try {
        client.controller.close();
      } catch (error) {
        console.error("Error closing client connection:", error);
      }
    });

    this.clients.clear();
    this.userClients.clear();
    this.channelClients.clear();
  }

  /**
   * Send cross-instance message via Redis
   */
  async sendCrossInstanceMessage(message: Omit<SSERedisMessage, 'instanceId' | 'timestamp'>): Promise<void> {
    if (!this.redisService) return;

    const redisMessage: SSERedisMessage = {
      ...message,
      instanceId: this.instanceId,
      timestamp: Date.now(),
    };

    // Store message for other instances to pick up
    const pendingKey = `sse:pending:${this.instanceId}`;
    await this.redisService.setValue(pendingKey, JSON.stringify(redisMessage), { ex: 60 }); // Expire in 60 seconds
  }
} 