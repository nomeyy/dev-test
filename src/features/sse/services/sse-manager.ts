import { type SSEEvent, type SSEClient, type SSEManager } from "../types";

class SSEManagerImpl implements SSEManager {
  public clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastLogTime = 0;
  private logThrottle = 5000; // Only log every 5 seconds

  constructor() {
    this.startHeartbeat();
  }

  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);

    // Throttle logging to prevent spam
    const now = Date.now();
    if (now - this.lastLogTime > this.logThrottle) {
      console.log(`SSE: ${this.clients.size} active clients`);
      this.lastLogTime = now;
    }
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.close();
      this.clients.delete(clientId);

      // Only log disconnections if we have significant changes
      const now = Date.now();
      if (now - this.lastLogTime > this.logThrottle) {
        console.log(`SSE: ${this.clients.size} active clients`);
        this.lastLogTime = now;
      }
    }
  }

  sendToClient(clientId: string, event: SSEEvent): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.send(event);
    }
  }

  sendToUser(userId: string, event: SSEEvent): void {
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId) {
        this.sendToClient(clientId, event);
      }
    }
  }

  broadcast(event: SSEEvent): void {
    for (const [clientId] of this.clients) {
      this.sendToClient(clientId, event);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // Only send heartbeat if we have active clients
      if (this.clients.size > 0) {
        this.broadcast({
          event: "ping",
          data: { timestamp: Date.now() },
        });
      }
    }, 30000); // Send ping every 30 seconds
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.clear();
  }
}

// Singleton instance
export const sseManager = new SSEManagerImpl();
