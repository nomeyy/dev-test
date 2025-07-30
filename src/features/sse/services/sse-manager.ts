/**
 * SSE Manager - Central management for Server-Sent Events
 *
 * This class manages all SSE client connections, handles event dispatching,
 * manages heartbeats, and provides a clean API for backend services.
 */

import type {
  SSEClient,
  SSEEvent,
  SSEEventFilter,
  SSEManagerConfig,
  SSEClientLifecycleHandler,
  SSEConnectionOptions,
} from "../types";
import {
  formatSSEEvent,
  createHeartbeatEvent,
  createConnectionEvent,
  encodeSSEData,
  generateClientId,
  isClientActive,
} from "../utils/sse-helpers";

/**
 * Centralized SSE connection manager
 */
export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private userClients = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private lifecycleHandlers: SSEClientLifecycleHandler[] = [];
  private config: Required<SSEManagerConfig>;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      cleanupInterval: 60000, // 1 minute
      maxIdleTime: 300000, // 5 minutes
      maxClientsPerUser: 5,
      debug: false,
      ...config,
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Creates a new SSE connection for a client
   */
  public createConnection(options: SSEConnectionOptions = {}): Response {
    const clientId = generateClientId();

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        try {
          // Create client object
          const client: SSEClient = {
            id: clientId,
            userId: options.userId,
            sessionId: options.sessionId,
            response: new Response(), // Will be set later
            controller,
            connectedAt: new Date(),
            lastActivity: new Date(),
            metadata: options.metadata,
          };

          // Check client limits for authenticated users
          if (options.userId) {
            this.enforceClientLimits(options.userId);

            // Track user clients
            if (!this.userClients.has(options.userId)) {
              this.userClients.set(options.userId, new Set());
            }
            this.userClients.get(options.userId)!.add(clientId);
          }

          // Store client
          this.clients.set(clientId, client);

          // Send connection established event
          this.sendToClient(clientId, createConnectionEvent(clientId));

          // Notify lifecycle handlers
          this.notifyLifecycleHandlers("connect", client);

          this.log(
            `Client ${clientId} connected${options.userId ? ` (user: ${options.userId})` : ""}`,
          );
        } catch (error) {
          this.log(`Error creating connection: ${String(error)}`);
          controller.error(error);
        }
      },

      cancel: () => {
        this.disconnectClient(clientId);
      },
    });

    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });

    // Update the response reference in the client
    const client = this.clients.get(clientId);
    if (client) {
      // Create a new client object with the correct response
      const updatedClient: SSEClient = {
        ...client,
        response,
      };
      this.clients.set(clientId, updatedClient);
    }

    return response;
  }

  /**
   * Sends an event to a specific client
   */
  public sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      this.log(`Client ${clientId} not found`);
      return false;
    }

    try {
      const formattedEvent = formatSSEEvent(event);
      const encodedData = encodeSSEData(formattedEvent);

      client.controller.enqueue(encodedData);
      client.lastActivity = new Date();

      this.log(`Sent event "${event.event}" to client ${clientId}`);
      return true;
    } catch (error) {
      this.log(`Error sending to client ${clientId}: ${String(error)}`);
      this.disconnectClient(clientId);
      return false;
    }
  }

  /**
   * Sends an event to multiple clients based on filter
   */
  public sendToClients(event: SSEEvent, filter: SSEEventFilter = {}): number {
    const targetClients = this.getFilteredClients(filter);
    let successCount = 0;

    for (const client of targetClients) {
      if (this.sendToClient(client.id, event)) {
        successCount++;
      }
    }

    this.log(
      `Sent event "${event.event}" to ${successCount}/${targetClients.length} clients`,
    );
    return successCount;
  }

  /**
   * Broadcasts an event to all connected clients
   */
  public broadcast(event: SSEEvent): number {
    return this.sendToClients(event);
  }

  /**
   * Sends an event to all clients of a specific user
   */
  public sendToUser(userId: string, event: SSEEvent): number {
    const result = this.sendToClients(event, { userIds: [userId] });
    console.log("SSE Manager - sendToUser result:", result);
    return result;
  }

  /**
   * Disconnects a specific client
   */
  public disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Close the controller
      client.controller.close();

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

      // Remove from clients map
      this.clients.delete(clientId);

      // Notify lifecycle handlers
      this.notifyLifecycleHandlers("disconnect", client);

      this.log(`Client ${clientId} disconnected`);
    } catch (error) {
      this.log(`Error disconnecting client ${clientId}: ${String(error)}`);
      this.notifyLifecycleHandlers("error", client, error as Error);
    }
  }

  /**
   * Gets connection statistics
   */
  public getStats() {
    return {
      totalClients: this.clients.size,
      authenticatedUsers: this.userClients.size,
      clientsPerUser: Array.from(this.userClients.entries()).map(
        ([userId, clients]) => ({
          userId,
          clientCount: clients.size,
        }),
      ),
    };
  }

  /**
   * Adds a lifecycle event handler
   */
  public onClientLifecycle(handler: SSEClientLifecycleHandler): void {
    this.lifecycleHandlers.push(handler);
  }

  /**
   * Removes a lifecycle event handler
   */
  public removeClientLifecycleHandler(
    handler: SSEClientLifecycleHandler,
  ): void {
    const index = this.lifecycleHandlers.indexOf(handler);
    if (index > -1) {
      this.lifecycleHandlers.splice(index, 1);
    }
  }

  /**
   * Destroys the SSE manager and cleans up all resources
   */
  public destroy(): void {
    // Disconnect all clients
    for (const clientId of this.clients.keys()) {
      this.disconnectClient(clientId);
    }

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear handlers
    this.lifecycleHandlers = [];

    this.log("SSE Manager destroyed");
  }

  // Private methods

  private getFilteredClients(filter: SSEEventFilter): SSEClient[] {
    const allClients = Array.from(this.clients.values());

    console.log("SSE Manager - getFilteredClients called with filter:", filter);
    console.log(
      "SSE Manager - All clients:",
      allClients.map((c) => ({
        id: c.id,
        userId: c.userId,
        sessionId: c.sessionId,
      })),
    );

    if (
      !filter.clientIds &&
      !filter.userIds &&
      !filter.sessionIds &&
      !filter.customFilter
    ) {
      console.log("SSE Manager - No filter applied, returning all clients");
      return allClients;
    }

    const filtered = allClients.filter((client) => {
      // Filter by client IDs
      if (filter.clientIds && !filter.clientIds.includes(client.id)) {
        console.log(
          "SSE Manager - Client",
          client.id,
          "filtered out by clientIds",
        );
        return false;
      }

      // Filter by user IDs
      if (
        filter.userIds &&
        (!client.userId || !filter.userIds.includes(client.userId))
      ) {
        console.log(
          "SSE Manager - Client",
          client.id,
          "filtered out by userIds. Client userId:",
          client.userId,
          "Filter userIds:",
          filter.userIds,
        );
        return false;
      }

      // Filter by session IDs
      if (
        filter.sessionIds &&
        (!client.sessionId || !filter.sessionIds.includes(client.sessionId))
      ) {
        console.log(
          "SSE Manager - Client",
          client.id,
          "filtered out by sessionIds",
        );
        return false;
      }

      // Custom filter
      if (filter.customFilter && !filter.customFilter(client)) {
        console.log(
          "SSE Manager - Client",
          client.id,
          "filtered out by customFilter",
        );
        return false;
      }

      console.log("SSE Manager - Client", client.id, "passed all filters");
      return true;
    });

    console.log(
      "SSE Manager - Filtered clients:",
      filtered.map((c) => ({ id: c.id, userId: c.userId })),
    );
    return filtered;
  }

  private enforceClientLimits(userId: string): void {
    const userClientSet = this.userClients.get(userId);
    if (!userClientSet) return;

    if (userClientSet.size >= this.config.maxClientsPerUser) {
      // Disconnect oldest client
      const oldestClientId = Array.from(userClientSet)[0];
      if (oldestClientId) {
        this.log(`Disconnecting oldest client for user ${userId} due to limit`);
        this.disconnectClient(oldestClientId);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent = createHeartbeatEvent();
      const sentCount = this.broadcast(heartbeatEvent);
      this.log(`Sent heartbeat to ${sentCount} clients`);
    }, this.config.heartbeatInterval);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const clientsToRemove: string[] = [];

      for (const [clientId, client] of this.clients) {
        if (!isClientActive(client.lastActivity, this.config.maxIdleTime)) {
          clientsToRemove.push(clientId);
        }
      }

      for (const clientId of clientsToRemove) {
        this.log(`Cleaning up inactive client ${clientId}`);
        this.disconnectClient(clientId);
      }

      if (clientsToRemove.length > 0) {
        this.log(`Cleaned up ${clientsToRemove.length} inactive clients`);
      }
    }, this.config.cleanupInterval);
  }

  private notifyLifecycleHandlers(
    event: "connect" | "disconnect" | "error",
    client: SSEClient,
    error?: Error,
  ): void {
    for (const handler of this.lifecycleHandlers) {
      try {
        handler(event, client, error);
      } catch (handlerError) {
        this.log(`Error in lifecycle handler: ${String(handlerError)}`);
      }
    }
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[SSE Manager] ${message}`);
    }
  }
}

// Singleton instance
let sseManagerInstance: SSEManager | null = null;

/**
 * Gets the singleton SSE manager instance
 */
export function getSSEManager(config?: SSEManagerConfig): SSEManager {
  sseManagerInstance ??= new SSEManager(config);
  return sseManagerInstance;
}

/**
 * Resets the SSE manager instance (useful for testing)
 */
export function resetSSEManager(): void {
  if (sseManagerInstance) {
    sseManagerInstance.destroy();
    sseManagerInstance = null;
  }
}
