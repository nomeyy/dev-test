/**
 * SSE Connection Manager
 * Manages active client connections, tracks them by user/session,
 * and provides methods for sending events to specific clients
 */

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  connectedAt: Date;
  lastPing?: Date;
}

export interface SSEMessage {
  type: string;
  data: any;
  timestamp?: string;
}

class SSEConnectionManager {
  private clients = new Map<string, SSEClient>();
  private userClients = new Map<string, Set<string>>(); // userId -> Set of clientIds
  private sessionClients = new Map<string, Set<string>>(); // sessionId -> Set of clientIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT_MS = 60000; // 60 seconds

  /**
   * Add a new client connection
   */
  addClient(client: SSEClient): void {
    console.log(`SSE: Adding client ${client.id}`, {
      userId: client.userId,
      sessionId: client.sessionId,
    });

    this.clients.set(client.id, client);

    // Track by userId if provided
    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client.id);
    }

    // Track by sessionId if provided
    if (client.sessionId) {
      if (!this.sessionClients.has(client.sessionId)) {
        this.sessionClients.set(client.sessionId, new Set());
      }
      this.sessionClients.get(client.sessionId)!.add(client.id);
    }

    console.log(`SSE: Total clients: ${this.clients.size}`);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`SSE: Removing client ${clientId}`);

    // Remove from user tracking
    if (client.userId) {
      const userClientSet = this.userClients.get(client.userId);
      if (userClientSet) {
        userClientSet.delete(clientId);
        if (userClientSet.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    // Remove from session tracking
    if (client.sessionId) {
      const sessionClientSet = this.sessionClients.get(client.sessionId);
      if (sessionClientSet) {
        sessionClientSet.delete(clientId);
        if (sessionClientSet.size === 0) {
          this.sessionClients.delete(client.sessionId);
        }
      }
    }

    // Remove from main clients map
    this.clients.delete(clientId);

    console.log(`SSE: Total clients: ${this.clients.size}`);
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: SSEMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`SSE: Client ${clientId} not found`);
      return false;
    }

    return this.sendMessageToClient(client, message);
  }

  /**
   * Send message to all clients of a specific user
   */
  sendToUser(userId: string, message: SSEMessage): number {
    const clientIds = this.userClients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      console.warn(`SSE: No clients found for user ${userId}`);
      return 0;
    }

    let sentCount = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && this.sendMessageToClient(client, message)) {
        sentCount++;
      }
    }

    console.log(
      `SSE: Sent message to ${sentCount}/${clientIds.size} clients for user ${userId}`,
    );
    return sentCount;
  }

  /**
   * Send message to all clients in a session
   */
  sendToSession(sessionId: string, message: SSEMessage): number {
    const clientIds = this.sessionClients.get(sessionId);
    if (!clientIds || clientIds.size === 0) {
      console.warn(`SSE: No clients found for session ${sessionId}`);
      return 0;
    }

    let sentCount = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && this.sendMessageToClient(client, message)) {
        sentCount++;
      }
    }

    console.log(
      `SSE: Sent message to ${sentCount}/${clientIds.size} clients for session ${sessionId}`,
    );
    return sentCount;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: SSEMessage): number {
    let sentCount = 0;
    for (const client of this.clients.values()) {
      if (this.sendMessageToClient(client, message)) {
        sentCount++;
      }
    }

    console.log(
      `SSE: Broadcasted message to ${sentCount}/${this.clients.size} clients`,
    );
    return sentCount;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      totalUsers: this.userClients.size,
      totalSessions: this.sessionClients.size,
      clientsPerUser: Array.from(this.userClients.entries()).map(
        ([userId, clients]) => ({
          userId,
          clientCount: clients.size,
        }),
      ),
      clientsPerSession: Array.from(this.sessionClients.entries()).map(
        ([sessionId, clients]) => ({
          sessionId,
          clientCount: clients.size,
        }),
      ),
    };
  }

  /**
   * Get all clients for debugging
   */
  getAllClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Private method to send message to a specific client
   */
  private sendMessageToClient(client: SSEClient, message: SSEMessage): boolean {
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      };

      const sseData = `data: ${JSON.stringify(messageWithTimestamp)}\n\n`;
      client.controller.enqueue(client.encoder.encode(sseData));
      return true;
    } catch (error) {
      console.error(
        `SSE: Error sending message to client ${client.id}:`,
        error,
      );
      // Remove the client if sending fails (connection likely closed)
      this.removeClient(client.id);
      return false;
    }
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return; // Already running
    }

    console.log("SSE: Starting heartbeat mechanism");
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeatToAll();
      this.cleanupInactiveClients();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      console.log("SSE: Stopping heartbeat mechanism");
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat/ping to all connected clients
   */
  private sendHeartbeatToAll(): void {
    const heartbeatMessage: SSEMessage = {
      type: "heartbeat",
      data: {
        message: "ping",
        timestamp: new Date().toISOString(),
      },
    };

    let successCount = 0;
    let failedCount = 0;

    for (const client of this.clients.values()) {
      if (this.sendMessageToClient(client, heartbeatMessage)) {
        client.lastPing = new Date();
        successCount++;
      } else {
        failedCount++;
      }
    }

    if (this.clients.size > 0) {
      console.log(
        `SSE: Heartbeat sent - Success: ${successCount}, Failed: ${failedCount}`,
      );
    }
  }

  /**
   * Clean up clients that haven't responded to heartbeat
   */
  private cleanupInactiveClients(): void {
    const now = new Date();
    const inactiveClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      const lastActivity = client.lastPing || client.connectedAt;
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

      if (timeSinceLastActivity > this.CLIENT_TIMEOUT_MS) {
        inactiveClients.push(clientId);
      }
    }

    if (inactiveClients.length > 0) {
      console.log(
        `SSE: Cleaning up ${inactiveClients.length} inactive clients`,
      );
      for (const clientId of inactiveClients) {
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Update client's last ping time (called when client responds to heartbeat)
   */
  updateClientPing(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get heartbeat configuration
   */
  getHeartbeatConfig() {
    return {
      heartbeatIntervalMs: this.HEARTBEAT_INTERVAL_MS,
      clientTimeoutMs: this.CLIENT_TIMEOUT_MS,
      isRunning: this.heartbeatInterval !== null,
    };
  }

  /**
   * Generate unique client ID
   */
  generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const sseConnectionManager = new SSEConnectionManager();

// Start heartbeat when module loads
sseConnectionManager.startHeartbeat();
