import { randomUUID } from 'crypto';
import type {
  SSEClient,
  SSEMessage,
  SSEEventPayload,
  SSEManagerConfig,
  SSEConnectionInfo,
  SSEStats,
} from '../types/index';

export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private config: Required<SSEManagerConfig>;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      clientTimeout: config.clientTimeout ?? 60000, // 60 seconds
      maxConnections: config.maxConnections ?? 1000,
      enableLogging: config.enableLogging ?? process.env.NODE_ENV === 'development',
    };

    this.startHeartbeat();
  }

  /**
   * Create a new SSE connection
   */
  createConnection(
    userId?: string,
    sessionId?: string
  ): { response: Response; clientId: string } {
    if (this.clients.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const clientId = randomUUID();
    let controller: ReadableStreamDefaultController<string>;
    const stream = new ReadableStream<string>({
      start(ctrl) {
        controller = ctrl;
        try {
          ctrl.enqueue(': SSE connection established\n\n');
        } catch (error) {
          console.error('Error sending initial SSE message:', error);
        }
      },
      cancel: () => {
        this.log(`Client ${clientId} stream cancelled`);
        this.removeClient(clientId);
      },
    });

    const response = new Response(stream, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, X-Requested-With',
        'Access-Control-Expose-Headers': 'Content-Type',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked',
      },
    });

    const client: SSEClient = {
      id: clientId,
      userId,
      sessionId,
      response,
      controller: controller!,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.clients.set(clientId, client);

    setTimeout(() => {
      this.sendToClient(clientId, {
        event: 'connected',
        data: { clientId, connectedAt: client.connectedAt },
      });
    }, 100);

    return { response, clientId };
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(clientId: string, payload: Omit<SSEEventPayload, 'targetClientId'>): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      this.log(`Client ${clientId} not found`);
      return false;
    }

    try {
      const message: SSEMessage = {
        id: randomUUID(),
        event: payload.event,
        data: payload.data,
        timestamp: new Date(),
      };

      const formattedMessage = this.formatSSEMessage(message);

      if (client.controller) {
        client.controller.enqueue(formattedMessage);
        this.log(`Message sent to client ${clientId}: ${payload.event}`);
        return true;
      } else {
        this.log(`Client ${clientId} controller is not available`);
        this.removeClient(clientId);
        return false;
      }
    } catch (error) {
      this.log(`Error sending message to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send a message to all clients of a specific user
   */
  sendToUser(userId: string, payload: Omit<SSEEventPayload, 'targetUserId'>): number {
    const userClients = Array.from(this.clients.values()).filter(
      client => client.userId === userId
    );

    let sentCount = 0;
    for (const client of userClients) {
      if (this.sendToClient(client.id, payload)) {
        sentCount++;
      }
    }

    this.log(`Message sent to ${sentCount} clients for user ${userId}: ${payload.event}`);
    return sentCount;
  }

  /**
   * Send a message to all clients in a specific session
   */
  sendToSession(sessionId: string, payload: Omit<SSEEventPayload, 'targetSessionId'>): number {
    const sessionClients = Array.from(this.clients.values()).filter(
      client => client.sessionId === sessionId
    );

    let sentCount = 0;
    for (const client of sessionClients) {
      if (this.sendToClient(client.id, payload)) {
        sentCount++;
      }
    }

    this.log(`Message sent to ${sentCount} clients for session ${sessionId}: ${payload.event}`);
    return sentCount;
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(payload: Omit<SSEEventPayload, 'targetUserId' | 'targetSessionId' | 'targetClientId'>): number {
    let sentCount = 0;
    for (const client of this.clients.values()) {
      if (this.sendToClient(client.id, payload)) {
        sentCount++;
      }
    }

    this.log(`Broadcast message sent to ${sentCount} clients: ${payload.event}`);
    return sentCount;
  }

  /**
   * Send message based on payload targeting
   */
  sendMessage(payload: SSEEventPayload): number {
    if (payload.targetClientId) {
      return this.sendToClient(payload.targetClientId, payload) ? 1 : 0;
    }

    if (payload.targetUserId) {
      return this.sendToUser(payload.targetUserId, payload);
    }

    if (payload.targetSessionId) {
      return this.sendToSession(payload.targetSessionId, payload);
    }
    // If no specific target, broadcast to all
    return this.broadcast(payload);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    // try {
    //   client.controller.close();
    // } catch (error) {
    //   this.log(`Error closing client ${clientId}:`, error);
    // }

    this.clients.delete(clientId);
    this.log(`Client ${clientId} disconnected`);
    return true;
  }

  /**
   * Get information about a specific connection
   */
  getConnectionInfo(clientId: string): SSEConnectionInfo | null {
    const client = this.clients.get(clientId);
    if (!client) {
      return null;
    }

    return {
      clientId: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
    };
  }

  /**
   * Get all active connections
   */
  getConnections(): SSEConnectionInfo[] {
    return Array.from(this.clients.values()).map(client => ({
      clientId: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
    }));
  }

  /**
   * Get connection statistics
   */
  getStats(): SSEStats {
    const connectionsByUser: Record<string, number> = {};
    const connectionsBySession: Record<string, number> = {};

    for (const client of this.clients.values()) {
      if (client.userId) {
        connectionsByUser[client.userId] = (connectionsByUser[client.userId] || 0) + 1;
      }
      if (client.sessionId) {
        connectionsBySession[client.sessionId] = (connectionsBySession[client.sessionId] || 0) + 1;
      }
    }

    return {
      totalConnections: this.clients.size,
      connectionsByUser,
      connectionsBySession,
    };
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const expiredClients: string[] = [];

      for (const [clientId, client] of this.clients.entries()) {
        const timeSinceLastHeartbeat = now.getTime() - client.lastHeartbeat.getTime();

        if (timeSinceLastHeartbeat > this.config.clientTimeout) {
          expiredClients.push(clientId);
        } else {
          try {
            const heartbeatMessage = this.formatSSEMessage({
              id: randomUUID(),
              event: 'ping',
              data: { timestamp: now },
              timestamp: now,
            });

            if (client.controller) {
              client.controller.enqueue(heartbeatMessage);
              client.lastHeartbeat = now;
            } else {

              expiredClients.push(clientId);
            }
          } catch (error) {
            this.log(`Error sending heartbeat to client ${clientId}:`, error);
            expiredClients.push(clientId);
          }
        }
      }
      // Remove expired clients
      for (const clientId of expiredClients) {
        console.log(`Removing expired client ${clientId}`);
        this.removeClient(clientId);
      }

      if (expiredClients.length > 0) {
        this.log(`Removed ${expiredClients.length} expired clients`);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Format message for SSE protocol
   */
  private formatSSEMessage(message: SSEMessage): string {
    const data = typeof message.data === 'string'
      ? message.data
      : JSON.stringify(message.data);

    // FIX 15: Ensure proper SSE format with retry field
    return `id: ${message.id}\nevent: ${message.event}\ndata: ${data}\nretry: 3000\n\n`;
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[SSEManager] ${message}`, ...args);
    }
  }

  /**
   * Cleanup all connections and intervals
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }

    this.log('SSE Manager destroyed');
  }
}
