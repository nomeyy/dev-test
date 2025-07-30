import type { SSEClient, SSEEvent, SSEManager } from "./types";

class SSEManagerImpl implements SSEManager {
  public clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private maxClients = 1000; // Maximum number of concurrent connections
  private maxErrorsPerClient = 5; // Maximum errors before disconnecting a client

  constructor() {
    this.startHeartbeat();
    this.startCleanup();
  }

  addClient(client: SSEClient): void {
    // Check if we've reached the maximum number of clients
    if (this.clients.size >= this.maxClients) {
      console.warn("SSE: Maximum number of clients reached");
      return;
    }

    // Initialize client properties
    client.isConnected = true;
    client.lastActivity = new Date();
    client.errorCount = 0;

    this.clients.set(client.id, client);
    console.log(
      `SSE: Client ${client.id} connected. Total clients: ${this.clients.size}`,
    );
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Mark as disconnected
      client.isConnected = false;

      // Close the controller if it exists
      if (client.controller) {
        try {
          client.controller.close();
        } catch (error) {
          console.warn(
            `SSE: Error closing controller for client ${clientId}:`,
            error,
          );
        }
      }

      this.clients.delete(clientId);
      console.log(
        `SSE: Client ${clientId} disconnected. Total clients: ${this.clients.size}`,
      );
    }
  }

  async sendToClient(clientId: string, event: SSEEvent): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client || !client.isConnected) {
      console.warn(`SSE: Client ${clientId} not found or not connected`);
      return false;
    }

    try {
      const sseData = this.formatSSEEvent(event);
      const encoder = new TextEncoder();
      const chunk = encoder.encode(sseData);

      if (client.controller) {
        client.controller.enqueue(chunk);
        client.lastActivity = new Date();
        client.errorCount = 0; // Reset error count on successful send
        console.log(`SSE: Sent event '${event.event}' to client ${clientId}`);
        return true;
      } else {
        console.warn(`SSE: No controller available for client ${clientId}`);
        return false;
      }
    } catch (error) {
      console.error(`SSE: Error sending event to client ${clientId}:`, error);
      client.errorCount++;

      // Disconnect client if too many errors
      if (client.errorCount >= this.maxErrorsPerClient) {
        console.warn(
          `SSE: Disconnecting client ${clientId} due to too many errors`,
        );
        this.removeClient(clientId);
      }

      return false;
    }
  }

  async sendToUser(userId: string, event: SSEEvent): Promise<number> {
    const userClients = this.getClientsByUserId(userId);
    let sentCount = 0;

    for (const client of userClients) {
      if (await this.sendToClient(client.id, event)) {
        sentCount++;
      }
    }

    console.log(
      `SSE: Sent event '${event.event}' to ${sentCount} clients for user ${userId}`,
    );
    return sentCount;
  }

  async broadcast(event: SSEEvent): Promise<number> {
    let sentCount = 0;
    const clientIds = Array.from(this.clients.keys()); // Create a copy to avoid modification during iteration

    for (const clientId of clientIds) {
      if (await this.sendToClient(clientId, event)) {
        sentCount++;
      }
    }

    console.log(
      `SSE: Broadcasted event '${event.event}' to ${sentCount} clients`,
    );
    return sentCount;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientById(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  getClientsByUserId(userId: string): SSEClient[] {
    const userClients: SSEClient[] = [];
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.isConnected) {
        userClients.push(client);
      }
    }
    return userClients;
  }

  isClientConnected(clientId: string): boolean {
    const client = this.clients.get(clientId);
    return client?.isConnected ?? false;
  }

  private formatSSEEvent(event: SSEEvent): string {
    let sseData = "";

    if (event.id) {
      sseData += `id: ${event.id}\n`;
    }

    if (event.retry) {
      sseData += `retry: ${event.retry}\n`;
    }

    sseData += `event: ${event.event}\n`;
    sseData += `data: ${JSON.stringify(event.data)}\n\n`;

    return sseData;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const pingEvent: SSEEvent = {
        event: "ping",
        data: { timestamp: Date.now() },
      };

      this.broadcast(pingEvent);

      // Update last ping time for all connected clients
      for (const [clientId, client] of this.clients) {
        if (client.isConnected) {
          client.lastPing = new Date();
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      const inactiveThreshold = 10 * 60 * 1000; // 10 minutes

      for (const [clientId, client] of this.clients) {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        const timeSinceLastActivity =
          now.getTime() - client.lastActivity.getTime();

        // Remove stale or inactive clients
        if (
          timeSinceLastPing > staleThreshold ||
          timeSinceLastActivity > inactiveThreshold
        ) {
          console.log(`SSE: Removing stale/inactive client ${clientId}`);
          this.removeClient(clientId);
        }
      }
    }, 60000); // Check for stale connections every minute
  }

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    const clientIds = Array.from(this.clients.keys());
    for (const clientId of clientIds) {
      this.removeClient(clientId);
    }

    console.log("SSE: Manager cleaned up");
  }
}

// Singleton instance
let sseManagerInstance: SSEManager | null = null;

export function getSSEManager(): SSEManager {
  if (!sseManagerInstance) {
    sseManagerInstance = new SSEManagerImpl();
  }
  return sseManagerInstance;
}

export function cleanupSSEManager(): void {
  if (sseManagerInstance) {
    sseManagerInstance.cleanup();
    sseManagerInstance = null;
  }
}
