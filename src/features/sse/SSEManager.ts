import { logger } from "@/features/shared/logger";
import type {
  SSEClient,
  SSEClientId,
  SSEEvent,
  SSEManagerInterface,
} from "./types";

class SSEManager implements SSEManagerInterface {
  private static instance: SSEManager;
  private clients: Map<SSEClientId, SSEClient>;

  private constructor() {
    this.clients = new Map();
  }

  public static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  public addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    logger.info("Client registered", { clientId: client.id });
  }

  public removeClient(clientId: SSEClientId): void {
    if (this.clients.delete(clientId)) {
      logger.info("Client removed", { clientId });
    }
  }

  public async sendEvent(event: SSEEvent): Promise<void> {
    const { type, data, targetClientIds } = event;
    if (targetClientIds) {
      await this.sendToClients(targetClientIds, type, data);
    } else {
      await this.broadcast(type, data);
    }
  }

  public async broadcast(type: string, data: unknown): Promise<void> {
    const errors: Error[] = [];

    for (const client of this.clients.values()) {
      try {
        await client.send(type, data);
      } catch (error) {
        errors.push(error as Error);
        logger.error("Error broadcasting to client", {
          error,
          clientId: client.id,
        });
        this.removeClient(client.id);
      }
    }

    if (errors.length > 0) {
      logger.warn("Broadcast completed with errors", {
        errorCount: errors.length,
      });
    }
  }

  public async sendToClient(
    clientId: SSEClientId,
    type: string,
    data: unknown,
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn("Client not found", { clientId });
      return;
    }

    try {
      await client.send(type, data);
    } catch (error) {
      logger.error("Error sending to client", { error, clientId });
      this.removeClient(clientId);
      throw error;
    }
  }

  public async sendToClients(
    clientIds: SSEClientId[],
    type: string,
    data: unknown,
  ): Promise<void> {
    const errors: Error[] = [];

    for (const clientId of clientIds) {
      try {
        await this.sendToClient(clientId, type, data);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      logger.warn("Multiple client send completed with errors", {
        errorCount: errors.length,
      });
    }
  }

  public cleanup(): void {
    this.clients.clear();
    logger.info("SSE Manager cleaned up");
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }
}

export const sseManager = SSEManager.getInstance();
