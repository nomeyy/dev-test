import { EventEmitter } from 'events';
import type {
  SSEClient,
  SSEEvent,
  SSEConnectionOptions,
  SSEManagerConfig,
  SSENotification,
  SSENotificationTarget,
  SSEMetrics,
} from '../types';

export class SSEManager extends EventEmitter {
  // connectionId -> SSEClient
  private connections: Map<string, SSEClient> = new Map();
  // clientId -> Set<connectionId>
  private clientIdToConnections: Map<string, Set<string>> = new Map();
  // userId -> Set<connectionId>
  private userConnections: Map<string, Set<string>> = new Map();
  // sessionId -> Set<connectionId>
  private sessionConnections: Map<string, Set<string>> = new Map();
  private config: SSEManagerConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metrics: SSEMetrics;

  constructor(config: Partial<SSEManagerConfig> = {}) {
    super();
    
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      maxConnections: 1000,
      connectionTimeout: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      ...config,
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      totalEventsSent: 0,
      totalErrors: 0,
      lastCleanup: new Date(),
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Register a new client connection
   */
  registerClient(
    clientId: string,
    sendFunction: (data: string) => void,
    closeFunction: () => void,
    options: SSEConnectionOptions = {}
  ): SSEClient {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const connectionId = `con-${Math.random().toString(36).slice(2, 10)}`;
    const client: SSEClient = {
      connectionId,
      clientId,
      userId: options.userId,
      sessionId: options.sessionId,
      role: options.role,
      connectionTime: new Date(),
      lastActivity: new Date(),
      isAlive: true,
      send: sendFunction,
      close: closeFunction,
    };

    this.connections.set(connectionId, client);
    if (!this.clientIdToConnections.has(clientId)) this.clientIdToConnections.set(clientId, new Set());
    this.clientIdToConnections.get(clientId)!.add(connectionId);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Track user connections
    if (options.userId) {
      if (!this.userConnections.has(options.userId)) this.userConnections.set(options.userId, new Set());
      this.userConnections.get(options.userId)!.add(connectionId);
    }

    // Track session connections
    if (options.sessionId) {
      if (!this.sessionConnections.has(options.sessionId)) this.sessionConnections.set(options.sessionId, new Set());
      this.sessionConnections.get(options.sessionId)!.add(connectionId);
    }

    this.emit('clientConnected', client);
    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(connectionId: string, reason: string = 'disconnected'): boolean {
    const client = this.connections.get(connectionId);
    if (!client) {
      return false;
    }

    // Remove from user connections
    if (client.userId) {
      const userConnections = this.userConnections.get(client.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) this.userConnections.delete(client.userId);
      }
    }

    // Remove from session connections
    if (client.sessionId) {
      const sessionConnections = this.sessionConnections.get(client.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(connectionId);
        if (sessionConnections.size === 0) this.sessionConnections.delete(client.sessionId);
      }
    }

    // Remove from clientId map
    const set = this.clientIdToConnections.get(client.clientId);
    if (set) {
      set.delete(connectionId);
      if (set.size === 0) this.clientIdToConnections.delete(client.clientId);
    }

    // Remove connection
    this.connections.delete(connectionId);
    this.metrics.activeConnections--;
    
    this.emit('clientDisconnected', connectionId, reason);
    return true;
  }

  /**
   * Send an event to specific clients
   */
  sendEvent(event: SSEEvent, target: SSENotificationTarget): number {
    let sentCount = 0;
    const clientsToNotify = this.getTargetClients(target);

    for (const client of clientsToNotify) {
      try {
        if (client.isAlive) {
          const eventData = this.formatEvent(event);
          client.send(eventData);
          // Also send a default message event for clients that only handle 'message' (skip for core system events to avoid duplicates)
          if (event.event !== 'connected' && event.event !== 'heartbeat') {
            const defaultData = this.formatDefaultEvent(event);
            client.send(defaultData);
          }
          client.lastActivity = new Date();
          sentCount++;
        }
      } catch (error) {
        this.metrics.totalErrors++;
        this.emit('error', error, client.connectionId);
        
        // Mark client as dead if sending fails
        client.isAlive = false;
      }
    }

    this.metrics.totalEventsSent += sentCount;
    return sentCount;
  }

  /**
   * Send a notification (convenience method)
   */
  sendNotification(notification: SSENotification): number {
    const event: SSEEvent = {
      event: notification.event,
      data: notification.data,
      timestamp: new Date(),
    };

    return this.sendEvent(event, notification.target);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: SSEEvent): number {
    return this.sendEvent(event, { broadcast: true });
  }

  /**
   * Send heartbeat to keep connections alive
   */
  private sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      event: 'heartbeat',
      data: { timestamp: new Date().toISOString() },
      timestamp: new Date(),
    };

    this.broadcast(heartbeatEvent);
  }

  /**
   * Get clients based on target criteria
   */
  private getTargetClients(target: SSENotificationTarget): SSEClient[] {
    if (target.broadcast) return Array.from(this.connections.values());
    if (target.connectionId) {
      const c = this.connections.get(target.connectionId);
      return c ? [c] : [];
    }
    const result = new Set<SSEClient>();
    if (target.clientId) {
      const set = this.clientIdToConnections.get(target.clientId);
      if (set) for (const cid of set) {
        const c = this.connections.get(cid); if (c) result.add(c);
      }
    }
    if (target.userId) {
      const set = this.userConnections.get(target.userId);
      if (set) for (const cid of set) {
        const c = this.connections.get(cid); if (c) result.add(c);
      }
    }
    if (target.sessionId) {
      const set = this.sessionConnections.get(target.sessionId);
      if (set) for (const cid of set) {
        const c = this.connections.get(cid); if (c) result.add(c);
      }
    }
    return Array.from(result);
  }

  /**
   * Format event for SSE protocol
   */
  private formatEvent(event: SSEEvent): string {
    let formatted = '';
    
    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }
    
    formatted += `event: ${event.event}\n`;
    formatted += `data: ${JSON.stringify(event.data)}\n`;
    
    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }
    
    formatted += '\n';
    return formatted;
  }

  /**
   * Format a default (unnamed) SSE event that will be received as 'message'
   * Embeds the original event name inside the payload for clients to interpret.
   */
  private formatDefaultEvent(event: SSEEvent): string {
    const payload = { event: event.event, data: event.data };
    return `data: ${JSON.stringify(payload)}\n\n`;
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup mechanism
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadConnections();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up dead connections
   */
  private cleanupDeadConnections(): void {
    const now = new Date();
    const deadClients: string[] = [];

    for (const [connectionId, client] of this.connections) {
      const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
      
      if (timeSinceActivity > this.config.connectionTimeout || !client.isAlive) {
        deadClients.push(connectionId);
      }
    }

    for (const connectionId of deadClients) {
      this.removeClient(connectionId, 'timeout');
    }

    this.metrics.lastCleanup = now;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SSEMetrics {
    return { ...this.metrics };
  }

  /**
   * Get client count by user
   */
  getClientCountByUser(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Get client count by session
   */
  getClientCountBySession(sessionId: string): number {
    return this.sessionConnections.get(sessionId)?.size || 0;
  }

  /**
   * Get all active clients
   */
  getActiveClients(): SSEClient[] {
    return Array.from(this.connections.values()).filter(client => client.isAlive);
  }

  /**
   * Check if a client is connected
   */
  isClientConnected(clientId: string): boolean {
    const set = this.clientIdToConnections.get(clientId);
    return !!(set && set.size > 0);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all connections
    for (const client of this.connections.values()) {
      try {
        client.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    this.connections.clear();
    this.clientIdToConnections.clear();
    this.userConnections.clear();
    this.sessionConnections.clear();
    
    this.removeAllListeners();
  }
}
