import { logToFile } from "./logger";
import type { Client } from "./types";

class SSEManager {
  public clients: Map<string, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  public instanceId: string;

  constructor() {
    this.startHeartbeat();
    this.instanceId = crypto.randomUUID();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast("ping", { event: "ping", payload: "Heartbeat" });
    }, 25000);
  }

  public addClient(client: Client) {
    this.clients.set(client.userId || client.id, client);
    logToFile(`CONNECTED: ${client.name} (${client.id})`);
  }

  public removeClient(id: string) {
    const client = this.clients.get(id);
    try {
      if (client && this.clients.delete(id)) {
      }
    } catch (err) {
      logToFile(
        `ERROR on disconnect for ${client?.name} (${client?.id}): ${String(err)}`,
      );
    }
  }

  public sendEvent(clientId: string, event: string, data: unknown) {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  public broadcast(event: string, data: unknown) {
    for (const client of this.clients.values()) {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  public getActiveUsers() {
    return Array.from(this.clients.values()).map(({ id, userId, name }) => ({
      id,
      userId,
      name,
      status: "connected",
    }));
  }
}

export const sseManager = new SSEManager();
