import type { SSEClient, SSEMessage, SSEConnectionOptions } from "../types";

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private keepAliveIntervals: Map<string, ReturnType<typeof setInterval>> =
    new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly CLIENT_TIMEOUT = 120000;

  constructor() {
    this.startHeartbeat();
  }

  addClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    options: SSEConnectionOptions = {},
  ): void {
    const client: SSEClient = {
      id: clientId,
      userId: options.userId,
      sessionId: options.sessionId,
      controller,
      lastPing: new Date(),
    };

    this.clients.set(clientId, client);
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.controller.close();
      } catch (error) {}
      this.clients.delete(clientId);

      const keepAliveInterval = this.keepAliveIntervals.get(clientId);
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        this.keepAliveIntervals.delete(clientId);
      }
    }
  }

  /**
   * Add keep-alive interval for a client
   */
  addKeepAliveInterval(
    clientId: string,
    interval: ReturnType<typeof setInterval>,
  ): void {
    this.keepAliveIntervals.set(clientId, interval);
  }

  /**
   * Send a message to specific clients or broadcast to all
   */
  sendMessage(message: SSEMessage): void {
    const { event, data, target = "all" } = message;

    let targetClients: SSEClient[] = [];

    if (target === "all") {
      targetClients = Array.from(this.clients.values());
    } else if (Array.isArray(target)) {
      targetClients = target
        .map((id: string) => this.clients.get(id))
        .filter((client): client is SSEClient => client !== undefined);
    } else {
      const client = this.clients.get(target);
      if (client) {
        targetClients = [client];
      }
    }

    const sseData = this.formatSSEMessage(event, data);

    targetClients.forEach((client) => {
      try {
        const encoder = new TextEncoder();
        const chunk = encoder.encode(sseData);

        client.controller.enqueue(chunk);
        client.lastPing = new Date();
      } catch (error) {
        console.error(`Failed to send message to client ${client.id}:`, error);
        this.removeClient(client.id);
      }
    });
  }

  /**
   * Send a heartbeat/ping message to all clients
   */
  private sendHeartbeat(): void {
    this.sendMessage({
      event: "ping",
      data: { timestamp: new Date().toISOString() },
      target: "all",
    });
  }

  /**
   * Start the heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
      if (timeSinceLastPing > this.CLIENT_TIMEOUT) {
        staleClients.push(clientId);
      }
    });

    staleClients.forEach((clientId) => {
      this.removeClient(clientId);
    });
  }

  /**
   * Format SSE message according to the SSE specification
   */
  private formatSSEMessage(
    event: string,
    data: Record<string, unknown>,
  ): string {
    const id = Date.now().toString();
    const jsonData = JSON.stringify(data);

    return `id: ${id}\nevent: ${event}\ndata: ${jsonData}\n\n`;
  }

  /**
   * Get all connected clients
   */
  getConnectedClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Cleanup method to stop heartbeat and remove all clients
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.keepAliveIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.keepAliveIntervals.clear();

    this.clients.forEach((client, clientId) => {
      this.removeClient(clientId);
    });
  }
}

export const sseManager = new SSEManager();
