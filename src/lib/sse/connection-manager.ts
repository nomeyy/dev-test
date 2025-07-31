/**
 * SSE Connection Manager
 *
 * Handles client connection lifecycle, tracking, and event dispatch
 */

import { sseLogger } from "./logger";
import type { SSEClient, SSEEvent } from "./types";

export class ConnectionManager {
  private readonly clients = new Map<string, SSEClient>();
  private readonly userClients = new Map<string, Set<string>>();
  private readonly sessionClients = new Map<string, Set<string>>();
  private readonly disconnectHandlers = new Map<string, Array<() => void>>();

  /**
   * Add a new client connection
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);

    // Track by user ID
    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client.id);
    }

    // Track by session ID
    if (client.sessionId) {
      if (!this.sessionClients.has(client.sessionId)) {
        this.sessionClients.set(client.sessionId, new Set());
      }
      this.sessionClients.get(client.sessionId)!.add(client.id);
    }

    sseLogger.info("ConnectionManager", "Client added", {
      clientId: client.id,
      userId: client.userId || "anonymous",
      sessionId: client.sessionId || "none",
      totalClients: this.clients.size,
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string, reason: string = "unknown"): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    sseLogger.info("ConnectionManager", "Removing client", {
      clientId,
      userId: client.userId,
      sessionId: client.sessionId,
      reason,
      connectionDuration: Date.now() - client.connectedAt.getTime(),
    });

    // Execute disconnect handlers
    const handlers = this.disconnectHandlers.get(clientId);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler();
        } catch (error) {
          sseLogger.error(
            "ConnectionManager",
            "Error in disconnect handler",
            { clientId, reason },
            error as Error,
          );
        }
      });
      this.disconnectHandlers.delete(clientId);
    }

    // Close the connection safely
    try {
      if (client.controller.desiredSize !== null) {
        client.controller.close();
      }
    } catch (error) {
      sseLogger.debug(
        "ConnectionManager",
        "Controller already closed or error closing",
        {
          clientId,
          reason,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Remove from tracking maps
    this.clients.delete(clientId);

    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    if (client.sessionId) {
      const sessionClients = this.sessionClients.get(client.sessionId);
      if (sessionClients) {
        sessionClients.delete(clientId);
        if (sessionClients.size === 0) {
          this.sessionClients.delete(client.sessionId);
        }
      }
    }

    sseLogger.debug("ConnectionManager", "Client removed successfully", {
      clientId,
      reason,
      remainingClients: this.clients.size,
    });
  }

  /**
   * Get a specific client
   */
  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Check if client exists
   */
  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * Get all clients
   */
  getAllClients(): Map<string, SSEClient> {
    return new Map(this.clients);
  }

  /**
   * Get clients by user ID
   */
  getClientsByUser(userId: string): SSEClient[] {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter((client): client is SSEClient => client !== undefined);
  }

  /**
   * Get clients by session ID
   */
  getClientsBySession(sessionId: string): SSEClient[] {
    const clientIds = this.sessionClients.get(sessionId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter((client): client is SSEClient => client !== undefined);
  }

  /**
   * Send event to specific client
   */
  sendToClient<T>(clientId: string, event: SSEEvent<T>): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      sseLogger.warn("ConnectionManager", "Client not found for event", {
        clientId,
        eventType: event.type,
      });
      return false;
    }

    return this.sendEventToClient(client, event);
  }

  /**
   * Send event to all clients of a user
   */
  sendToUser<T>(userId: string, event: SSEEvent<T>): number {
    const clients = this.getClientsByUser(userId);
    let successCount = 0;

    for (const client of clients) {
      if (this.sendEventToClient(client, event)) {
        successCount++;
      }
    }

    sseLogger.info("ConnectionManager", "Event sent to user clients", {
      userId,
      eventType: event.type,
      totalClients: clients.length,
      successCount,
    });

    return successCount;
  }

  /**
   * Send event to all clients in a session
   */
  sendToSession<T>(sessionId: string, event: SSEEvent<T>): number {
    const clients = this.getClientsBySession(sessionId);
    let successCount = 0;

    for (const client of clients) {
      if (this.sendEventToClient(client, event)) {
        successCount++;
      }
    }

    sseLogger.info("ConnectionManager", "Event sent to session clients", {
      sessionId,
      eventType: event.type,
      totalClients: clients.length,
      successCount,
    });

    return successCount;
  }

  /**
   * Broadcast event to all clients
   */
  broadcast<T>(event: SSEEvent<T>): number {
    let successCount = 0;

    for (const client of this.clients.values()) {
      if (this.sendEventToClient(client, event)) {
        successCount++;
      }
    }

    sseLogger.info("ConnectionManager", "Event broadcasted to all clients", {
      eventType: event.type,
      totalClients: this.clients.size,
      successCount,
    });

    return successCount;
  }

  /**
   * Add disconnect handler for a client
   */
  onDisconnect(clientId: string, handler: () => void): void {
    if (!this.disconnectHandlers.has(clientId)) {
      this.disconnectHandlers.set(clientId, []);
    }
    this.disconnectHandlers.get(clientId)!.push(handler);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalClients: this.clients.size,
      totalUsers: this.userClients.size,
      totalSessions: this.sessionClients.size,
    };
  }

  /**
   * Send welcome message to new client
   */
  sendWelcomeMessage(client: SSEClient): void {
    const welcomeEvent: SSEEvent = {
      type: "system:welcome",
      data: {
        clientId: client.id,
        connectedAt: client.connectedAt.toISOString(),
        message: "Connected to SSE service",
      },
    };

    this.sendEventToClient(client, welcomeEvent);
  }

  /**
   * Update client ping timestamp
   */
  updateClientPing(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    client.lastHeartbeat = new Date();

    sseLogger.debug("ConnectionManager", "Client ping updated", {
      clientId,
      timestamp: client.lastHeartbeat.toISOString(),
    });

    return true;
  }

  /**
   * Generate unique client ID
   */
  generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Send event to a specific client (private helper)
   */
  private sendEventToClient<T>(client: SSEClient, event: SSEEvent<T>): boolean {
    try {
      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
        id:
          event.id ||
          `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };

      const sseData = `data: ${JSON.stringify(eventWithTimestamp)}\n\n`;
      client.controller.enqueue(client.encoder.encode(sseData));

      return true;
    } catch (error) {
      sseLogger.error(
        "ConnectionManager",
        "Failed to send event to client",
        {
          clientId: client.id,
          eventType: event.type,
        },
        error as Error,
      );

      // Remove the client if sending fails
      this.removeClient(client.id, "send_failed");
      return false;
    }
  }
}
