import { logger } from "@/utils/logging";
import type { SSEClient, SSEMessage, SSEServiceType } from "./types";

const SSE_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30 * 1000, // 30 seconds
  CLEANUP_INTERVAL_MS: 1 * 60 * 1000, // 1 minute
  TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;

class SSEService implements SSEServiceType {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly log = logger.createContextLogger("SSE");

  constructor() {
    this.startHeartbeat();
    this.startCleanup();
  }

  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    this.log.info(`Client connected: ${client.id}`, {
      userId: client.userId,
      sessionId: client.sessionId,
      totalClients: this.clients.size,
    });
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.isConnected = false;
      this.clients.delete(clientId);
      this.log.info(`Client disconnected: ${clientId}`, {
        totalClients: this.clients.size,
      });
    }
  }

  async sendMessage(message: SSEMessage): Promise<void> {
    const { event, data, target = "all", exclude = [] } = message;

    let targetClients: SSEClient[] = [];

    switch (target) {
      case "all":
        targetClients = Array.from(this.clients.values());
        break;
      default:
        if (Array.isArray(target)) {
          targetClients = Array.from(this.clients.values()).filter((client) =>
            target.includes(client.id),
          );
        }
        break;
    }

    targetClients = targetClients.filter(
      (client) => !exclude.includes(client.id),
    );

    await this.sendToClients(targetClients, event, data);
  }

  async sendToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const userClients = Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );

    await this.sendToClients(userClients, event, data);
  }

  async sendToAll(
    event: string,
    data: Record<string, unknown>,
    exclude: string[] = [],
  ): Promise<void> {
    const allClients = Array.from(this.clients.values()).filter(
      (client) => !exclude.includes(client.id),
    );
    await this.sendToClients(allClients, event, data);
  }

  getActiveClients(): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.isConnected,
    );
  }

  getClientCount(): number {
    return this.clients.size;
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

    for (const client of this.clients.values()) {
      try {
        client.controller.close();
      } catch (error) {
        this.log.warn(`Error closing client ${client.id}`, error);
      }
    }

    this.clients.clear();
  }

  private async sendToClients(
    clients: SSEClient[],
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const message = this.formatSSEMessage(event, data);
    const disconnectedClients: string[] = [];

    for (const client of clients) {
      if (!client.isConnected) {
        disconnectedClients.push(client.id);
        continue;
      }

      try {
        client.controller.enqueue(new TextEncoder().encode(message));
        client.lastActivity = Date.now();
      } catch (error) {
        this.log.warn(`Failed to send message to client ${client.id}`, error);
        disconnectedClients.push(client.id);
      }
    }

    for (const clientId of disconnectedClients) {
      this.removeClient(clientId);
    }
  }

  private formatSSEMessage(
    event: string,
    data: Record<string, unknown>,
  ): string {
    const id = Date.now().toString();
    const jsonData = JSON.stringify(data);

    return `id: ${id}\nevent: ${event}\ndata: ${jsonData}\n\n`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      void this.sendToAll("ping", { timestamp: Date.now() });
    }, SSE_CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const idleClients: string[] = [];

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastActivity > SSE_CONFIG.TIMEOUT_MS) {
          idleClients.push(clientId);
        }
      }

      for (const clientId of idleClients) {
        this.log.info(`Removing idle client: ${clientId}`);
        this.removeClient(clientId);
      }
    }, SSE_CONFIG.CLEANUP_INTERVAL_MS);
  }
}

export function createSSEService(): SSEService {
  return new SSEService();
}

export const sseService = createSSEService();
