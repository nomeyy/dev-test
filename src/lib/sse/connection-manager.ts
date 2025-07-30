/**
 * SSE Connection Manager
 * Manages active client connections, tracks them by user/session,
 * and provides methods for sending events to specific clients
 */

import { sseLogger } from "./logger";

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
  private isShuttingDown = false;
  private disconnectListeners = new Map<string, (() => void)[]>();

  /**
   * Add a new client connection
   */
  addClient(client: SSEClient): void {
    sseLogger.info(
      "ConnectionManager",
      "Adding new client",
      {
        totalClients: this.clients.size + 1,
        hasUserId: !!client.userId,
        hasSessionId: !!client.sessionId,
      },
      client.id,
      client.userId,
      client.sessionId,
    );

    try {
      this.clients.set(client.id, client);

      // Track by userId if provided
      if (client.userId) {
        if (!this.userClients.has(client.userId)) {
          this.userClients.set(client.userId, new Set());
          sseLogger.debug(
            "ConnectionManager",
            "Created new user tracking",
            { userId: client.userId },
            client.id,
            client.userId,
            client.sessionId,
          );
        }
        this.userClients.get(client.userId)!.add(client.id);
      }

      // Track by sessionId if provided
      if (client.sessionId) {
        if (!this.sessionClients.has(client.sessionId)) {
          this.sessionClients.set(client.sessionId, new Set());
          sseLogger.debug(
            "ConnectionManager",
            "Created new session tracking",
            { sessionId: client.sessionId },
            client.id,
            client.userId,
            client.sessionId,
          );
        }
        this.sessionClients.get(client.sessionId)!.add(client.id);
      }

      sseLogger.info(
        "ConnectionManager",
        "Client added successfully",
        {
          totalClients: this.clients.size,
          totalUsers: this.userClients.size,
          totalSessions: this.sessionClients.size,
        },
        client.id,
        client.userId,
        client.sessionId,
      );
    } catch (error) {
      sseLogger.error(
        "ConnectionManager",
        "Failed to add client",
        {
          totalClients: this.clients.size,
        },
        error as Error,
        client.id,
        client.userId,
        client.sessionId,
      );
      throw error;
    }
  }

  /**
   * Remove a client connection with enhanced cleanup
   */
  removeClient(clientId: string, reason: string = "unknown"): void {
    const client = this.clients.get(clientId);
    if (!client) {
      sseLogger.warn(
        "ConnectionManager",
        "Attempted to remove non-existent client",
        { reason },
        undefined,
        clientId,
      );
      return;
    }

    sseLogger.info(
      "ConnectionManager",
      "Removing client",
      {
        reason,
        connectedDuration: Date.now() - client.connectedAt.getTime(),
        totalClients: this.clients.size,
      },
      clientId,
      client.userId,
      client.sessionId,
    );

    try {
      // Send disconnect notification to client if possible
      if (!this.isShuttingDown && reason !== "client_disconnect") {
        try {
          this.sendMessageToClient(client, {
            type: "disconnect",
            data: {
              message: "Connection being closed by server",
              reason,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          sseLogger.warn(
            "ConnectionManager",
            "Failed to send disconnect notification",
            { reason },
            error as Error,
            clientId,
            client.userId,
            client.sessionId,
          );
        }
      }

      // Close the controller if it's still active
      try {
        client.controller.close();
      } catch (error) {
        sseLogger.warn(
          "ConnectionManager",
          "Failed to close controller",
          { reason },
          error as Error,
          clientId,
          client.userId,
          client.sessionId,
        );
      }

      // Execute disconnect listeners
      const listeners = this.disconnectListeners.get(clientId);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener();
          } catch (error) {
            sseLogger.error(
              "ConnectionManager",
              "Error executing disconnect listener",
              { reason },
              error as Error,
              clientId,
              client.userId,
              client.sessionId,
            );
          }
        });
        this.disconnectListeners.delete(clientId);
      }

      // Remove from user tracking
      if (client.userId) {
        const userClientSet = this.userClients.get(client.userId);
        if (userClientSet) {
          userClientSet.delete(clientId);
          if (userClientSet.size === 0) {
            this.userClients.delete(client.userId);
            sseLogger.info(
              "ConnectionManager",
              "No more clients for user",
              { userId: client.userId },
              clientId,
              client.userId,
              client.sessionId,
            );
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
            sseLogger.info(
              "ConnectionManager",
              "No more clients for session",
              { sessionId: client.sessionId },
              clientId,
              client.userId,
              client.sessionId,
            );
          }
        }
      }

      // Remove from main clients map
      this.clients.delete(clientId);

      sseLogger.info(
        "ConnectionManager",
        "Client removed successfully",
        {
          reason,
          totalClients: this.clients.size,
          totalUsers: this.userClients.size,
          totalSessions: this.sessionClients.size,
        },
        clientId,
        client.userId,
        client.sessionId,
      );
    } catch (error) {
      sseLogger.error(
        "ConnectionManager",
        "Error during client removal",
        {
          reason,
          forceRemoving: true,
        },
        error as Error,
        clientId,
        client.userId,
        client.sessionId,
      );

      // Force removal even if cleanup failed
      this.clients.delete(clientId);
      this.disconnectListeners.delete(clientId);
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: SSEMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      sseLogger.warn(
        "ConnectionManager",
        "Client not found for sendToClient",
        { messageType: message.type },
        undefined,
        clientId,
      );
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
      sseLogger.warn("ConnectionManager", "No clients found for user", {
        userId,
        messageType: message.type,
      });
      return 0;
    }

    let sentCount = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && this.sendMessageToClient(client, message)) {
        sentCount++;
      }
    }

    sseLogger.info("ConnectionManager", "Message sent to user clients", {
      userId,
      messageType: message.type,
      totalClients: clientIds.size,
      successCount: sentCount,
    });
    return sentCount;
  }

  /**
   * Send message to all clients in a session
   */
  sendToSession(sessionId: string, message: SSEMessage): number {
    const clientIds = this.sessionClients.get(sessionId);
    if (!clientIds || clientIds.size === 0) {
      sseLogger.warn("ConnectionManager", "No clients found for session", {
        sessionId,
        messageType: message.type,
      });
      return 0;
    }

    let sentCount = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && this.sendMessageToClient(client, message)) {
        sentCount++;
      }
    }

    sseLogger.info("ConnectionManager", "Message sent to session clients", {
      sessionId,
      messageType: message.type,
      totalClients: clientIds.size,
      successCount: sentCount,
    });
    return sentCount;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: SSEMessage): number {
    sseLogger.debug("ConnectionManager", "Broadcasting message", {
      messageType: message.type,
      totalClients: this.clients.size,
    });

    let sentCount = 0;
    for (const client of this.clients.values()) {
      if (this.sendMessageToClient(client, message)) {
        sentCount++;
      }
    }

    sseLogger.info("ConnectionManager", "Broadcast completed", {
      messageType: message.type,
      totalClients: this.clients.size,
      successCount: sentCount,
    });
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
      isShuttingDown: this.isShuttingDown,
      heartbeatEnabled: !!this.heartbeatInterval,
    };
  }

  /**
   * Get all clients (for debugging)
   */
  getAllClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Helper method to send message to a specific client
   */
  private sendMessageToClient(
    client: SSEClient,
    message: SSEMessage,
    skipLogging: boolean = false,
  ): boolean {
    try {
      if (!skipLogging) {
        sseLogger.debug(
          "ConnectionManager",
          "Sending message to client",
          {
            messageType: message.type,
          },
          client.id,
          client.userId,
          client.sessionId,
        );
      }

      const sseData = `data: ${JSON.stringify(message)}\n\n`;
      client.controller.enqueue(client.encoder.encode(sseData));
      return true;
    } catch (error) {
      sseLogger.error(
        "ConnectionManager",
        "Failed to send message to client",
        {
          messageType: message.type,
          removing: true,
        },
        error as Error,
        client.id,
        client.userId,
        client.sessionId,
      );

      // Remove the client if sending fails (connection likely closed)
      this.removeClient(client.id, "send_failed");
      return false;
    }
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      sseLogger.warn("ConnectionManager", "Heartbeat already running");
      return;
    }

    sseLogger.info("ConnectionManager", "Starting heartbeat mechanism", {
      intervalMs: this.HEARTBEAT_INTERVAL_MS,
      timeoutMs: this.CLIENT_TIMEOUT_MS,
    });
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
      sseLogger.info("ConnectionManager", "Stopping heartbeat mechanism");
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat/ping to all connected clients
   */
  private sendHeartbeatToAll(): void {
    const heartbeatMessage = {
      type: "heartbeat",
      data: {
        timestamp: new Date().toISOString(),
        ping: Date.now(),
      },
    };

    let successCount = 0;
    let failedCount = 0;

    for (const client of this.clients.values()) {
      if (this.sendMessageToClient(client, heartbeatMessage, true)) {
        client.lastPing = new Date();
        successCount++;
      } else {
        failedCount++;
      }
    }

    sseLogger.debug("ConnectionManager", "Heartbeat completed", {
      totalClients: this.clients.size,
      successCount,
      failedCount,
    });
  }

  /**
   * Clean up clients that haven't responded to heartbeat
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const inactiveClients: { clientId: string; inactiveTime: number }[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (client.lastPing) {
        const inactiveTime = now - client.lastPing.getTime();
        if (inactiveTime > this.CLIENT_TIMEOUT_MS) {
          inactiveClients.push({ clientId, inactiveTime });
        }
      }
    }

    if (inactiveClients.length > 0) {
      sseLogger.info("ConnectionManager", "Cleaning up inactive clients", {
        inactiveCount: inactiveClients.length,
        timeoutMs: this.CLIENT_TIMEOUT_MS,
      });

      for (const { clientId } of inactiveClients) {
        this.removeClient(clientId, "timeout");
      }
    }
  }

  /**
   * Update client's last ping time (called when client responds to heartbeat)
   */
  updateClientPing(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      sseLogger.warn(
        "ConnectionManager",
        "Attempted to update ping for non-existent client",
        {},
        undefined,
        clientId,
      );
      return false;
    }

    client.lastPing = new Date();
    sseLogger.debug(
      "ConnectionManager",
      "Updated client ping",
      {},
      clientId,
      client.userId,
      client.sessionId,
    );
    return true;
  }

  /**
   * Get heartbeat configuration
   */
  getHeartbeatConfig() {
    return {
      enabled: !!this.heartbeatInterval,
      interval: this.HEARTBEAT_INTERVAL_MS,
      timeout: this.CLIENT_TIMEOUT_MS,
      totalPings: this.clients.size,
      lastHeartbeat: new Date().toISOString(),
    };
  }

  /**
   * Add disconnect listener for a client
   */
  addDisconnectListener(clientId: string, listener: () => void): void {
    if (!this.disconnectListeners.has(clientId)) {
      this.disconnectListeners.set(clientId, []);
    }
    this.disconnectListeners.get(clientId)!.push(listener);
    sseLogger.debug(
      "ConnectionManager",
      "Added disconnect listener",
      {},
      clientId,
    );
  }

  /**
   * Remove disconnect listener for a client
   */
  removeDisconnectListener(clientId: string, listener: () => void): void {
    const listeners = this.disconnectListeners.get(clientId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.disconnectListeners.delete(clientId);
        }
        sseLogger.debug(
          "ConnectionManager",
          "Removed disconnect listener",
          {},
          clientId,
        );
      }
    }
  }

  /**
   * Gracefully shutdown all connections
   */
  async gracefulShutdown(timeoutMs: number = 5000): Promise<void> {
    sseLogger.info("ConnectionManager", "Starting graceful shutdown", {
      totalClients: this.clients.size,
      timeoutMs,
    });

    this.isShuttingDown = true;

    // Stop heartbeat
    this.stopHeartbeat();

    // Send shutdown notification to all clients
    const shutdownMessage = {
      type: "shutdown",
      data: {
        message: "Server is shutting down",
        timestamp: new Date().toISOString(),
      },
    };

    const clientIds = Array.from(this.clients.keys());
    sseLogger.info("ConnectionManager", "Notifying clients of shutdown", {
      clientCount: clientIds.length,
    });

    // Send shutdown message to all clients
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client) {
        try {
          this.sendMessageToClient(client, shutdownMessage, true);
        } catch (error) {
          sseLogger.warn(
            "ConnectionManager",
            "Failed to send shutdown notification",
            {},
            error as Error,
            clientId,
          );
        }
      }
    }

    // Wait for graceful shutdown or timeout
    await new Promise<void>((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.clients.size === 0 || Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Force disconnect any remaining clients
    if (this.clients.size > 0) {
      sseLogger.warn(
        "ConnectionManager",
        "Force disconnecting remaining clients",
        {
          remainingClients: this.clients.size,
        },
      );
      this.forceDisconnectAll("shutdown_timeout");
    }

    // Clear all state
    this.clients.clear();
    this.userClients.clear();
    this.sessionClients.clear();
    this.disconnectListeners.clear();

    sseLogger.info("ConnectionManager", "Graceful shutdown completed");
  }

  /**
   * Force disconnect all clients (emergency cleanup)
   */
  forceDisconnectAll(reason: string = "force_disconnect"): void {
    sseLogger.warn("ConnectionManager", "Force disconnecting all clients", {
      totalClients: this.clients.size,
      reason,
    });

    const clientIds = Array.from(this.clients.keys());
    for (const clientId of clientIds) {
      this.removeClient(clientId, reason);
    }

    // Clear all maps as backup
    this.clients.clear();
    this.userClients.clear();
    this.sessionClients.clear();
    this.disconnectListeners.clear();
  }

  /**
   * Check if manager is shutting down
   */
  isShuttingDownStatus(): boolean {
    return this.isShuttingDown;
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

// Graceful shutdown on process termination
if (typeof process !== "undefined") {
  const handleShutdown = async (signal: string) => {
    sseLogger.info(
      "ConnectionManager",
      `Received ${signal}, starting graceful shutdown`,
    );
    try {
      await sseConnectionManager.gracefulShutdown(10000);
      process.exit(0);
    } catch (error) {
      sseLogger.critical(
        "ConnectionManager",
        "Error during graceful shutdown",
        {},
        error as Error,
      );
      sseConnectionManager.forceDisconnectAll("emergency_shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGUSR2", () => handleShutdown("SIGUSR2")); // nodemon restart
}
