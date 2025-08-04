import type { SSEClient, SSEEvent } from "./types";

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(id: string, res: NodeJS.WritableStream) {
    this.clients.set(id, { id, res });
    res.on("close", () => this.removeClient(id));
    res.on("error", () => this.removeClient(id));
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  sendEventToClient(id: string, event: SSEEvent) {
    const client = this.clients.get(id);
    if (client) {
      this.writeEvent(client.res, event);
    }
  }

  broadcastEvent(event: SSEEvent) {
    for (const client of this.clients.values()) {
      this.writeEvent(client.res, event);
    }
  }

  private writeEvent(res: NodeJS.WritableStream, event: SSEEvent) {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        client.res.write(`event: ping\ndata: {}\n\n`);
      }
    }, 25000); // 25s, less than most proxies' 30s timeout
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }
}

export const sseManager = new SSEManager();
